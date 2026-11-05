import { router } from 'expo-router';
import * as React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  vantaApi,
  type AddMoneyRequestResult,
} from '@/api/vanta-api';
import { PageHeader, WalletMiniPill } from '@/components/fintech-ui';
import {
  AppIcon,
  Card,
  FormField,
  NoticeCard,
  PrimaryButton,
  Screen,
  SectionHeader,
  StatusIndicator,
  SummaryRow,
} from '@/components/ui';
import { withSession } from '@/modules/session/route-guard';
import type { SessionContextValue } from '@/modules/session/session-context';
import {
  baseFontFamily,
  colors,
  formatBdt,
  GATEWAYS,
  GATEWAY_LIST,
  radius,
  spacing,
  type,
  type GatewayCode,
} from '@/theme/tokens';
import { formatCountdown } from '@/utils/countdown';

const QUICK_ADD_AMOUNTS = [500, 1000, 2000, 5000];
const PROCESSING_NOTICE =
  'আপনার অ্যাড মানি রিকোয়েস্ট প্রসেসিং হচ্ছে। অ্যাডমিন যাচাই করার পর ১০ মিনিটের মধ্যে মূল অ্যাকাউন্টে ব্যালেন্স যোগ হয়ে যাবে।';

function AddMoneyScreen({ session }: { session: SessionContextValue }): React.JSX.Element {
  const [gatewayCode, setGatewayCode] = React.useState<GatewayCode>('BKASH');
  const [senderNumber, setSenderNumber] = React.useState(session.user?.phone ?? '');
  const [amountInput, setAmountInput] = React.useState('1000');
  const [amountFocused, setAmountFocused] = React.useState(false);

  const [formError, setFormError] = React.useState<string | null>(null);
  const [initiating, setInitiating] = React.useState(false);
  const [submissionSuccess, setSubmissionSuccess] = React.useState<AddMoneyRequestResult | null>(null);
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  const activeGateway = GATEWAYS[gatewayCode];
  const numericAmount = Number.parseFloat(amountInput.replace(/[^\d.]/g, '')) || 0;

  const pendingAddMoney = React.useMemo(
    () => session.user?.pendingAddMoney ?? [],
    [session.user?.pendingAddMoney],
  );

  // Synchronized countdown timer tick and automatic polling while holds are active
  React.useEffect(() => {
    const hasActiveHolds = pendingAddMoney.length > 0 || Boolean(submissionSuccess);
    if (!hasActiveHolds) return;

    let pollCounter = 0;
    const timer = setInterval(() => {
      setNowMs(Date.now());
      pollCounter += 1;
      // Refresh session from server every 4 seconds to detect admin approval
      if (pollCounter % 4 === 0) {
        void session.refresh();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingAddMoney.length, submissionSuccess, session]);

  const handleInitiate = async () => {
    setFormError(null);

    const cleanSender = senderNumber.trim();
    if (cleanSender.length < 6) {
      setFormError('সঠিক বিকাশ/নগদ মোবাইল নম্বর অথবা ব্যাংক অ্যাকাউন্ট নম্বর দিন।');
      return;
    }
    if (numericAmount < 50) {
      setFormError('সর্বনিম্ন অ্যাড মানি পরিমাণ ৳৫০ হতে হবে · Minimum Add Money amount is ৳50.');
      return;
    }

    setInitiating(true);
    try {
      const result = await vantaApi.createAddMoneyRequest({
        gateway: gatewayCode,
        senderNumber: cleanSender,
        amount: numericAmount,
      });
      await session.refresh();
      setSubmissionSuccess(result);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not submit Add Money request.');
    } finally {
      setInitiating(false);
    }
  };

  return (
    <Screen padded>
      <PageHeader
        backFallbackHref="/home"
        rightAccessory={<WalletMiniPill balance={session.user?.balance ?? 0} />}
        title="Add Money"
        subtitle="বিকাশ, নগদ অথবা ব্যাংক থেকে আপনার ওয়ালেটে টাকা যোগ করুন"
      />

      {formError ? (
        <NoticeCard
          tone="danger"
          title="Check deposit details"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      ) : null}

      {/* Active Processing Add Money Banner(s) */}
      {pendingAddMoney.map((trx) => (
        <View key={trx.trxId} style={styles.holdBanner}>
          <View style={styles.holdTopRow}>
            <StatusIndicator status="PROCESSING" label="Admin Verification in Progress" />
            <View style={styles.holdCountdownBadge}>
              <Text style={styles.holdCountdownValue}>
                {formatCountdown(trx.expiresAt || trx.scheduledReleaseAt, nowMs)}
              </Text>
            </View>
          </View>
          <Text style={styles.holdNoticeText}>{PROCESSING_NOTICE}</Text>
          <View style={styles.holdFooter}>
            <Text style={styles.holdMetaText}>
              {trx.paymentGateway} · {formatBdt(trx.amount)} · Ref: {trx.trxId}
            </Text>
            <Text style={styles.holdAdminPendingBadge}>Waiting for Admin</Text>
          </View>
        </View>
      ))}

      {/* Step 1A: Payment Method Selection */}
      <SectionHeader
        title="Payment source"
        caption="গেটওয়ে নির্বাচন করুন"
      />
      <View style={styles.gatewayRow}>
        {GATEWAY_LIST.map((gw) => {
          const selected = gw.code === gatewayCode;
          return (
            <Pressable
              key={gw.code}
              onPress={() => setGatewayCode(gw.code)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${gw.name} (${gw.bnName})`}
              style={({ pressed }) => [
                styles.gatewayTile,
                selected && styles.gatewayTileSelected,
                pressed && { opacity: 0.84 },
              ]}
            >
              <View style={[styles.gatewayBadge, { backgroundColor: gw.softBg }]}>
                <Text style={[styles.gatewayBadgeText, { color: gw.color }]}>
                  {gw.shortLabel}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.gatewayName}>
                {gw.name}
              </Text>
              <Text numberOfLines={1} style={styles.gatewayBn}>
                {gw.bnName}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Step 1B: Sender Number & Amount Form */}
      <Card style={styles.formCard}>
        <View style={styles.selectedMethodBar}>
          <View style={[styles.methodDot, { backgroundColor: activeGateway.color }]} />
          <Text style={styles.selectedMethodTitle}>{activeGateway.name}</Text>
          <Text numberOfLines={1} style={styles.selectedMethodSub}>
            · {activeGateway.subtitle}
          </Text>
        </View>

        <FormField
          label={`Sender ${activeGateway.name} number · প্রেরকের নম্বর`}
          placeholder={activeGateway.placeholder}
          keyboardType="phone-pad"
          value={senderNumber}
          onChangeText={setSenderNumber}
        />

        <Text style={styles.inputLabel}>Amount · টাকার পরিমাণ (minimum ৳50)</Text>
        <View style={styles.quickAmountRow}>
          {QUICK_ADD_AMOUNTS.map((amt) => {
            const active = Number(amountInput) === amt;
            return (
              <Pressable
                key={amt}
                onPress={() => setAmountInput(String(amt))}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.quickChip, active && styles.quickChipActive]}
              >
                <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>
                  {formatBdt(amt)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.amountInputBox, amountFocused && styles.amountInputBoxFocused]}>
          <Text style={styles.amountCurrency}>৳</Text>
          <TextInput
            value={amountInput}
            onChangeText={(v) => setAmountInput(v.replace(/\D/g, '').slice(0, 6))}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            placeholder="500"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            accessibilityLabel="Add Money amount in Taka"
            style={styles.amountInput}
          />
        </View>

        <View style={{ height: spacing.lg }} />
        <PrimaryButton
          title={`Submit Request · ${formatBdt(numericAmount)}`}
          onPress={handleInitiate}
          loading={initiating}
          fullWidth
        />
      </Card>

      {/* Submission Success & 10-Minute Countdown Modal */}
      <Modal
        visible={Boolean(submissionSuccess)}
        transparent
        animationType="fade"
        onRequestClose={() => setSubmissionSuccess(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.holdIconCircle}>
              <AppIcon name="clock" size={24} color={colors.warning} />
            </View>
            <Text style={styles.holdModalHeading}>Request submitted · প্রসেসিং হচ্ছে</Text>
            <Text style={styles.holdModalSub}>
              Wait please 10 minutes! অ্যাডমিন আপনার ডিপোজিট যাচাই করার পর ওয়ালেটে ব্যালেন্স যোগ করে দেওয়া হবে।
            </Text>

            {submissionSuccess ? (
              <View style={styles.summaryBox}>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownTitle}>Approval Window</Text>
                  <Text style={styles.countdownLarge}>
                    {formatCountdown(submissionSuccess.expiresAt, nowMs)}
                  </Text>
                </View>
                <SummaryRow
                  label="Reference"
                  value={submissionSuccess.transaction.trxId}
                  tone="strong"
                  showDivider
                />
                <SummaryRow
                  label="Payment Source"
                  value={submissionSuccess.transaction.paymentGateway}
                  showDivider
                />
                <SummaryRow
                  label="Sender"
                  value={submissionSuccess.transaction.targetPhone}
                  showDivider
                />
                <SummaryRow
                  label="Amount"
                  value={formatBdt(submissionSuccess.transaction.amount)}
                  tone="strong"
                />
              </View>
            ) : null}

            <PrimaryButton
              title="Got it · ঠিক আছে"
              onPress={() => {
                setSubmissionSuccess(null);
                router.replace('/home');
              }}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  holdBanner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 84, 0.28)',
    borderRadius: radius.lg,
    padding: 15,
    marginBottom: 18,
    gap: 8,
  },
  holdTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  holdCountdownBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.xs,
    backgroundColor: colors.warningSoft,
  },
  holdCountdownValue: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
  },
  holdNoticeText: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
  },
  holdFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 8,
  },
  holdMetaText: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    color: colors.textFaint,
    flex: 1,
  },
  holdAdminPendingBadge: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
  },

  gatewayRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  gatewayTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  gatewayTileSelected: {
    borderColor: colors.primaryBorder,
    backgroundColor: 'rgba(34, 199, 182, 0.08)',
  },
  gatewayBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  gatewayBadgeText: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    fontWeight: '800',
  },
  gatewayName: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: colors.text,
  },
  gatewayBn: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: 2,
  },

  formCard: {
    marginBottom: spacing.lg,
  },
  selectedMethodBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingBottom: 12,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  methodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedMethodTitle: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  selectedMethodSub: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },

  inputLabel: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
    color: '#DCE6F2',
    marginBottom: 6,
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  quickChipText: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  quickChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  amountInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 14,
  },
  amountInputBoxFocused: {
    borderColor: colors.primary,
    backgroundColor: '#152236',
  },
  amountCurrency: {
    fontFamily: baseFontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontFamily: baseFontFamily,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
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
    alignItems: 'center',
  },
  holdIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 84, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  holdModalHeading: {
    ...type.h2,
    textAlign: 'center',
    marginBottom: 6,
  },
  holdModalSub: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  countdownBox: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: 8,
  },
  countdownTitle: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  countdownLarge: {
    fontFamily: baseFontFamily,
    fontSize: 28,
    fontWeight: '800',
    color: colors.warning,
  },
});

export default withSession(AddMoneyScreen as React.ComponentType<{ session: SessionContextValue }>);
