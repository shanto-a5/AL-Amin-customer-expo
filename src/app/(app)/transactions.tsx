import * as React from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { vantaApi } from '@/api/vanta-api';
import { PageHeader } from '@/components/fintech-ui';
import {
  AppIcon,
  EmptyState,
  FilterTabs,
  LoadingSkeleton,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusIndicator,
  SummaryRow,
  type AppIconName,
} from '@/components/ui';
import type { TransactionDto, TransactionType } from '@/domain/types';
import { withSession, type ProtectedRoute } from '@/modules/session/route-guard';
import type { SessionContextValue } from '@/modules/session/session-context';
import {
  baseFontFamily,
  colors,
  formatBdt,
  GATEWAYS,
  OPERATORS,
  radius,
  spacing,
  type,
  type GatewayCode,
  type OperatorCode,
} from '@/theme/tokens';

function formatTrxTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function transactionDisplayMeta(trx: TransactionDto): {
  title: string;
  providerLabel: string;
  accentColor: string;
  accentBg: string;
  icon: AppIconName;
} {
  if (trx.type === 'ADD_MONEY') {
    const gw = GATEWAYS[trx.paymentGateway as GatewayCode];
    return {
      title: 'Add Money · অ্যাড মানি',
      providerLabel: gw ? gw.name : trx.paymentGateway,
      accentColor: colors.success,
      accentBg: colors.successSoft,
      icon: 'wallet',
    };
  }
  const op =
    trx.operator !== 'NONE' && OPERATORS[trx.operator as OperatorCode]
      ? OPERATORS[trx.operator as OperatorCode]
      : null;

  if (trx.type === 'OFFER_PURCHASE') {
    return {
      title: trx.metadata?.offerTitle
        ? String(trx.metadata.offerTitle)
        : 'Bundle purchase · অফার প্যাক',
      providerLabel: op ? op.name : trx.operator,
      accentColor: op ? op.color : colors.primary,
      accentBg: op ? op.softBg : colors.primarySoft,
      icon: 'offers',
    };
  }

  return {
    title: 'Flexiload · ফ্লেক্সিলোড',
    providerLabel: op ? op.name : trx.operator,
    accentColor: op ? op.color : colors.primary,
    accentBg: op ? op.softBg : colors.primarySoft,
    icon: 'bolt',
  };
}

function TransactionsHistoryScreen({
  session,
}: {
  session: SessionContextValue;
}): React.JSX.Element {
  const [transactions, setTransactions] = React.useState<TransactionDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<'ALL' | TransactionType>('ALL');
  const [selectedTrx, setSelectedTrx] = React.useState<TransactionDto | null>(null);
  const [completingId, setCompletingId] = React.useState<string | null>(null);

  const loadHistory = React.useCallback(async () => {
    try {
      const res = await vantaApi.transactions({ limit: 80 });
      setTransactions(res.transactions);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const filtered = React.useMemo(() => {
    if (typeFilter === 'ALL') return transactions;
    return transactions.filter((t) => t.type === typeFilter);
  }, [transactions, typeFilter]);

  const handleInstantSettle = async (trxId: string) => {
    setCompletingId(trxId);
    try {
      await vantaApi.completeAddMoneyNow(trxId);
      await session.refresh();
      await loadHistory();
      setSelectedTrx(null);
    } finally {
      setCompletingId(null);
    }
  };

  const handleShare = async (trx: TransactionDto) => {
    const text = [
      'AllPay BD (অল পে বিডি) — Transaction Receipt',
      `Reference: ${trx.trxId}`,
      `Type: ${trx.type}`,
      `Number / Account: ${trx.targetPhone}`,
      `Amount: ${formatBdt(trx.amount)}`,
      `Status: ${trx.status}`,
      `Date: ${new Date(trx.createdAt).toLocaleString()}`,
    ].join('\n');
    try {
      await Share.share({ message: text });
    } catch {
      // Ignore user cancellation
    }
  };

  return (
    <Screen
      padded
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadHistory();
            void session.refresh();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <PageHeader
        eyebrow="Activity ledger"
        title="History"
        subtitle="ফ্লেক্সিলোড, অফার ক্রয় এবং অ্যাড মানি লেনদেনের বিবরণী"
      />

      <FilterTabs
        tabs={[
          { key: 'ALL', label: 'All', count: transactions.length },
          { key: 'FLEXILOAD', label: 'Flexiload' },
          { key: 'OFFER_PURCHASE', label: 'Offers' },
          { key: 'ADD_MONEY', label: 'Add Money' },
        ]}
        active={typeFilter}
        onChange={(k) => setTypeFilter(k as 'ALL' | TransactionType)}
      />

      {loading ? (
        <LoadingSkeleton rows={4} height={92} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          message="Your Flexiload recharges, bundle purchases, and Add Money deposits will appear here."
          actionLabel={typeFilter !== 'ALL' ? 'Show all activity' : undefined}
          onAction={typeFilter !== 'ALL' ? () => setTypeFilter('ALL') : undefined}
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((trx) => {
            const isAddMoney = trx.type === 'ADD_MONEY';
            const meta = transactionDisplayMeta(trx);

            return (
              <Pressable
                key={trx.id}
                onPress={() => setSelectedTrx(trx)}
                accessibilityRole="button"
                accessibilityLabel={`${meta.title}, ${trx.targetPhone}, ${formatBdt(trx.amount)}, status ${trx.status}`}
                style={({ pressed }) => [styles.trxRow, pressed && styles.trxRowPressed]}
              >
                <View style={[styles.trxIconBox, { backgroundColor: meta.accentBg }]}>
                  <AppIcon name={meta.icon} size={18} color={meta.accentColor} />
                </View>

                <View style={styles.trxCenter}>
                  <View style={styles.trxTitleLine}>
                    <Text numberOfLines={1} style={styles.trxTitle}>
                      {meta.title}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={styles.trxTargetLine}>
                    {meta.providerLabel} · {trx.targetPhone}
                  </Text>
                  <Text numberOfLines={1} style={styles.trxMetaLine}>
                    {formatTrxTimestamp(trx.createdAt)} · {trx.trxId}
                  </Text>
                </View>

                <View style={styles.trxRight}>
                  <Text
                    style={[
                      styles.trxAmount,
                      isAddMoney && trx.status === 'COMPLETED' ? styles.trxAmountPositive : null,
                    ]}
                  >
                    {isAddMoney ? '+' : '-'}
                    {formatBdt(trx.amount)}
                  </Text>
                  <StatusIndicator status={trx.status} />
                  {trx.status === 'PROCESSING' && isAddMoney ? (
                    <Pressable
                      onPress={() => handleInstantSettle(trx.trxId)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`Settle ${trx.trxId} immediately`}
                      style={styles.settleLinkBtn}
                    >
                      <Text style={styles.settleLinkText}>
                        {completingId === trx.trxId ? 'Settling...' : 'Settle now →'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Transaction Receipt Detail Modal */}
      <Modal
        visible={Boolean(selectedTrx)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTrx(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={type.h2}>Transaction receipt</Text>
                <Text style={[type.caption, { marginTop: 2 }]}>
                  AllPay BD verified transaction record
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedTrx(null)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close receipt"
              >
                <AppIcon name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {selectedTrx ? (
              <View style={styles.receiptStatusRow}>
                <Text style={styles.receiptAmountHero}>
                  {selectedTrx.type === 'ADD_MONEY' ? '+' : '-'}
                  {formatBdt(selectedTrx.amount, true)}
                </Text>
                <StatusIndicator status={selectedTrx.status} />
              </View>
            ) : null}

            {selectedTrx ? (
              <View style={styles.summaryBox}>
                <SummaryRow label="Reference" value={selectedTrx.trxId} tone="strong" showDivider />
                <SummaryRow
                  label="Type"
                  value={
                    selectedTrx.type === 'ADD_MONEY'
                      ? 'Add Money'
                      : selectedTrx.type === 'OFFER_PURCHASE'
                        ? 'Offer purchase'
                        : 'Flexiload'
                  }
                  showDivider
                />
                <SummaryRow
                  label="Operator / Gateway"
                  value={
                    selectedTrx.operator !== 'NONE'
                      ? selectedTrx.operator
                      : selectedTrx.paymentGateway
                  }
                  showDivider
                />
                <SummaryRow label="Number / Account" value={selectedTrx.targetPhone} showDivider />
                {selectedTrx.metadata?.offerTitle ? (
                  <SummaryRow
                    label="Package"
                    value={String(selectedTrx.metadata.offerTitle)}
                    showDivider
                  />
                ) : null}
                {selectedTrx.metadata?.balanceAfter !== null &&
                selectedTrx.metadata?.balanceAfter !== undefined ? (
                  <SummaryRow
                    label="Balance after"
                    value={formatBdt(Number(selectedTrx.metadata.balanceAfter), true)}
                    tone="discount"
                    showDivider
                  />
                ) : null}
                <SummaryRow
                  label="Date & time"
                  value={new Date(selectedTrx.createdAt).toLocaleString()}
                  tone="muted"
                />
              </View>
            ) : null}

            {selectedTrx?.status === 'PROCESSING' && selectedTrx.type === 'ADD_MONEY' ? (
              <View style={{ marginBottom: spacing.sm }}>
                <PrimaryButton
                  title="Complete settlement now"
                  onPress={() => handleInstantSettle(selectedTrx.trxId)}
                  loading={completingId === selectedTrx.trxId}
                  fullWidth
                />
              </View>
            ) : null}

            <View style={styles.modalActions}>
              {selectedTrx ? (
                <SecondaryButton
                  title="Share"
                  icon="share"
                  onPress={() => handleShare(selectedTrx)}
                  style={{ flex: 1 }}
                />
              ) : null}
              <PrimaryButton
                title="Done"
                onPress={() => setSelectedTrx(null)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  trxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trxRowPressed: {
    backgroundColor: '#142238',
    borderColor: colors.primaryBorder,
  },
  trxIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  trxCenter: {
    flex: 1,
    minWidth: 0,
  },
  trxTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trxTitle: {
    fontFamily: baseFontFamily,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.text,
  },
  trxTargetLine: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  trxMetaLine: {
    fontFamily: baseFontFamily,
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.textFaint,
    marginTop: 3,
  },
  trxRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
    flexShrink: 0,
  },
  trxAmount: {
    fontFamily: baseFontFamily,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.text,
  },
  trxAmountPositive: {
    color: colors.success,
  },
  settleLinkBtn: {
    paddingTop: 2,
  },
  settleLinkText: {
    fontFamily: baseFontFamily,
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  receiptStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  receiptAmountHero: {
    fontFamily: baseFontFamily,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.text,
  },
  summaryBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
});

export default withSession(TransactionsHistoryScreen, '/transactions' satisfies ProtectedRoute);
