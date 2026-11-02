import * as React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { vantaApi } from '@/api/vanta-api';
import {
  Button,
  EmptyState,
  FilterTabs,
  Pill,
  Screen,
  SummaryRow,
} from '@/components/ui';
import type { TransactionDto, TransactionType } from '@/domain/types';
import { withSession, type ProtectedRoute } from '@/modules/session/route-guard';
import type { SessionContextValue } from '@/modules/session/session-context';
import {
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

function TransactionsHistoryScreen({ session }: { session: SessionContextValue }): React.JSX.Element {
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
      '=== AllPay BD (অল পে বিডি) Receipt ===',
      `TrxID: ${trx.trxId}`,
      `Type: ${trx.type}`,
      `Target / Account: ${trx.targetPhone}`,
      `Amount: ${formatBdt(trx.amount)}`,
      `Status: ${trx.status}`,
      `Time: ${new Date(trx.createdAt).toLocaleString()}`,
    ].join('\n');
    try {
      await Share.share({ message: text });
    } catch {
      // ignore
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
      <Text style={type.h1}>ট্রানজেকশন হিস্ট্রি • History</Text>
      <Text style={[type.caption, { marginTop: 2, marginBottom: spacing.md }]}>
        সকল ফ্লেক্সিলোড, অফার ক্রয় এবং অ্যাড মানি লেনদেনের ডিজিটাল লেজার
      </Text>

      <FilterTabs
        tabs={[
          { key: 'ALL', label: 'All • সব', count: transactions.length },
          { key: 'FLEXILOAD', label: 'Flexiload • ফ্লেক্সিলোড' },
          { key: 'OFFER_PURCHASE', label: 'Offers • অফার' },
          { key: 'ADD_MONEY', label: 'Add Money • অ্যাড মানি' },
        ]}
        active={typeFilter}
        onChange={(k) => setTypeFilter(k as 'ALL' | TransactionType)}
      />

      {loading ? (
        <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="কোনো লেনদেন পাওয়া যায়নি"
          message="আপনার ফ্লেক্সিলোড, অফার বা অ্যাড মানি লেনদেন সম্পন্ন হলে এখানে দেখা যাবে।"
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((trx) => {
            const isAddMoney = trx.type === 'ADD_MONEY';
            const opColor =
              trx.operator !== 'NONE' && OPERATORS[trx.operator as OperatorCode]
                ? OPERATORS[trx.operator as OperatorCode].color
                : GATEWAYS[trx.paymentGateway as GatewayCode]?.color ?? colors.primary;

            const statusTone =
              trx.status === 'COMPLETED'
                ? 'success'
                : trx.status === 'PROCESSING'
                  ? 'warning'
                  : 'danger';

            return (
              <Pressable
                key={trx.id}
                onPress={() => setSelectedTrx(trx)}
                style={({ pressed }) => [
                  styles.trxCard,
                  { borderLeftColor: opColor },
                  pressed && { opacity: 0.86 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.trxTopRow}>
                    <Text style={[styles.trxBadgeText, { color: opColor }]}>
                      {isAddMoney
                        ? `${trx.paymentGateway} • অ্যাড মানি`
                        : `${trx.operator} • ${trx.type === 'OFFER_PURCHASE' ? 'অফার প্যাক' : 'ফ্লেক্সিলোড'}`}
                    </Text>
                    <Pill label={trx.status} tone={statusTone} />
                  </View>

                  <Text style={styles.trxTarget}>{trx.targetPhone}</Text>
                  {trx.metadata?.offerTitle ? (
                    <Text style={styles.trxOfferTitle}>{String(trx.metadata.offerTitle)}</Text>
                  ) : null}
                  <Text style={styles.trxMeta}>
                    {trx.trxId} • {new Date(trx.createdAt).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.trxRight}>
                  <Text
                    style={[
                      styles.trxAmount,
                      { color: isAddMoney ? colors.success : colors.text },
                    ]}
                  >
                    {isAddMoney ? '+' : '-'}
                    {formatBdt(trx.amount)}
                  </Text>
                  {trx.status === 'PROCESSING' && isAddMoney ? (
                    <Pressable
                      onPress={() => handleInstantSettle(trx.trxId)}
                      style={styles.settleChip}
                    >
                      <Text style={styles.settleChipText}>
                        {completingId === trx.trxId ? '...' : '⚡ Settle'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.viewReceiptHint}>রিসিট দেখুন →</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Digital Receipt Detail Modal */}
      <Modal
        visible={Boolean(selectedTrx)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTrx(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={type.h2}>🧾 ডিজিটাল লেনদেন রিসিট</Text>
            <Text style={[type.caption, { marginTop: 2, marginBottom: spacing.md }]}>
              AllPay BD (অল পে বিডি) Verified Transaction Record
            </Text>

            {selectedTrx ? (
              <View style={styles.summaryBox}>
                <SummaryRow label="TrxID" value={selectedTrx.trxId} tone="strong" />
                <SummaryRow label="ধরন (Type)" value={selectedTrx.type} />
                <SummaryRow
                  label="অপারেটর / গেটওয়ে"
                  value={
                    selectedTrx.operator !== 'NONE'
                      ? selectedTrx.operator
                      : selectedTrx.paymentGateway
                  }
                />
                <SummaryRow label="নম্বর (Target)" value={selectedTrx.targetPhone} />
                {selectedTrx.metadata?.offerTitle ? (
                  <SummaryRow label="প্যাকেজ (Offer)" value={String(selectedTrx.metadata.offerTitle)} />
                ) : null}
                <SummaryRow label="পরিমাণ (Amount)" value={formatBdt(selectedTrx.amount)} tone="strong" />
                <SummaryRow label="স্ট্যাটাস (Status)" value={selectedTrx.status} tone="discount" />
                {selectedTrx.metadata?.balanceAfter !== null &&
                selectedTrx.metadata?.balanceAfter !== undefined ? (
                  <SummaryRow
                    label="ব্যালেন্স (Balance After)"
                    value={formatBdt(Number(selectedTrx.metadata.balanceAfter), true)}
                  />
                ) : null}
                <SummaryRow
                  label="সময় (Date & Time)"
                  value={new Date(selectedTrx.createdAt).toLocaleString()}
                  tone="muted"
                />
              </View>
            ) : null}

            {selectedTrx?.status === 'PROCESSING' && selectedTrx.type === 'ADD_MONEY' ? (
              <View style={{ marginBottom: spacing.sm }}>
                <Button
                  title="⚡ Simulate Instant Complete Now"
                  onPress={() => handleInstantSettle(selectedTrx.trxId)}
                  loading={completingId === selectedTrx.trxId}
                  fullWidth
                />
              </View>
            ) : null}

            <View style={styles.modalActions}>
              {selectedTrx ? (
                <Button
                  title="Share Receipt"
                  variant="secondary"
                  onPress={() => handleShare(selectedTrx)}
                  style={{ flex: 1 }}
                />
              ) : null}
              <Button
                title="বন্ধ করুন • Close"
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
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  trxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    gap: spacing.md,
  },
  trxTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  trxBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  trxTarget: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  trxOfferTitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  trxMeta: {
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 4,
  },
  trxRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  trxAmount: {
    fontSize: 16,
    fontWeight: '900',
  },
  settleChip: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  settleChipText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.textInverse,
  },
  viewReceiptHint: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
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
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  summaryBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default withSession(TransactionsHistoryScreen, '/transactions' satisfies ProtectedRoute);
