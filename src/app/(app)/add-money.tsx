import { router } from 'expo-router';
import * as React from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import {
  vantaApi,
  type InitiateAddMoneyResult,
  type VerifyAddMoneyOtpResult,
} from '@/api/vanta-api';
import { PageHeader, WalletMiniPill } from '@/components/fintech-ui';
import {
  AppIcon,
  Card,
  FormField,
  NoticeCard,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
  StatusIndicator,
  SummaryRow,
} from '@/components/ui';
import { withSession, type ProtectedRoute } from '@/modules/session/route-guard';
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

const QUICK_ADD_AMOUNTS = [500, 1000, 2000, 5000];
const PROCESSING_NOTICE =
  'আপনার অ্যাড মানি প্রসেসিং হচ্ছে। ১০ মিনিটের মধ্যে মূল অ্যাকাউন্টে ব্যালেন্স যোগ হয়ে যাবে।';

function formatCountdown(targetIso: string | null, nowMs: number): string {
  if (!targetIso) return '10:00';
  const diffSec = Math.max(0, Math.ceil((new Date(targetIso).getTime() - nowMs) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function AddMoneyScreen({ session }: { session: SessionContextValue }): React.JSX.Element {
  const [gatewayCode, setGatewayCode] = React.useState<GatewayCode>('BKASH');
  const [senderNumber, setSenderNumber] = React.useState(session.user?.phone ?? '');
  const [amountInput, setAmountInput] = React.useState('1000');
  const [amountFocused, setAmountFocused] = React.useState(false);

  const [formError, setFormError] = React.useState<string | null>(null);
  const [initiating, setInitiating] = React.useState(false);

  // Step 2: OTP Modal State
  const [otpSession, setOtpSession] = React.useState<InitiateAddMoneyResult | null>(null);
  const [otpInput, setOtpInput] = React.useState('');
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = React.useState(false);
  const [resendTimer, setResendTimer] = React.useState(120);

  // Step 3: 10-Minute Processing State
  const [verifiedHold, setVerifiedHold] = React.useState<VerifyAddMoneyOtpResult | null>(null);
  const [completingNow, setCompletingNow] = React.useState(false);
  const [completedBanner, setCompletedBanner] = React.useState<string | null>(null);
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  const activeGateway = GATEWAYS[gatewayCode];
  const numericAmount = Number.parseFloat(amountInput.replace(/[^\d.]/g, '')) || 0;

  React.useEffect(() => {
    if (!otpSession) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSession]);

  const pendingAddMoney = React.useMemo(
    () => session.user?.pendingAddMoney ?? [],
    [session.user?.pendingAddMoney],
  );

  React.useEffect(() => {
    if (!verifiedHold && pendingAddMoney.length === 0) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (
        verifiedHold?.scheduledReleaseAt &&
        new Date(verifiedHold.scheduledReleaseAt).getTime() <= current
      ) {
        void session.refresh();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [verifiedHold, pendingAddMoney.length, session]);

  const handleInitiate = async () => {
    setFormError(null);
    setCompletedBanner(null);

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
      const result = await vantaApi.initiateAddMoney({
        gateway: gatewayCode,
        senderNumber: cleanSender,
        amount: numericAmount,
      });
      setOtpInput(result.devOtp || '');
      setOtpError(null);
      setResendTimer(120);
      setOtpSession(result);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not initiate Add Money.');
    } finally {
      setInitiating(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpSession) return;
    setOtpError(null);
    const cleanOtp = otpInput.trim();
    if (!/^\d{4}$/.test(cleanOtp)) {
      setOtpError('৪ ডিজিটের ওটিপি কোড দিন · Enter the 4-digit OTP code.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const result = await vantaApi.verifyAddMoneyOtp({
        sessionId: otpSession.sessionId,
        otp: cleanOtp,
      });
      setOtpSession(null);
      setVerifiedHold(result);
      await session.refresh();
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Invalid OTP code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCompleteNow = async (trxId: string) => {
    setCompletingNow(true);
    try {
      const res = await vantaApi.completeAddMoneyNow(trxId);
      await session.refresh();
      setVerifiedHold(null);
      setCompletedBanner(
        `${formatBdt(res.transaction.amount)} (${res.transaction.paymentGateway}) credited to your wallet. Available balance: ${formatBdt(res.user?.balance ?? session.user?.balance ?? 0, true)}`,
      );
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not complete transaction.');
    } finally {
      setCompletingNow(false);
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

      {completedBanner ? (
        <NoticeCard
          tone="success"
          title="Balance credited"
          message={completedBanner}
          onDismiss={() => setCompletedBanner(null)}
        />
      ) : null}

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
            <StatusIndicator status="PROCESSING" label="Settlement hold" />
            <View style={styles.holdCountdownBadge}>
              <Text style={styles.holdCountdownValue}>
                {formatCountdown(trx.scheduledReleaseAt, nowMs)}
              </Text>
            </View>
          </View>
          <Text style={styles.holdNoticeText}>{PROCESSING_NOTICE}</Text>
          <View style={styles.holdFooter}>
            <Text style={styles.holdMetaText}>
              {trx.paymentGateway} · {formatBdt(trx.amount)} · {trx.trxId}
            </Text>
            <Pressable
              onPress={() => handleCompleteNow(trx.trxId)}
              disabled={completingNow}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Simulate instant settlement"
            >
              <Text style={styles.holdActionLink}>
                {completingNow ? 'Completing...' : 'Complete now →'}
              </Text>
            </Pressable>
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
          title={`Continue · ${formatBdt(numericAmount)}`}
          onPress={handleInitiate}
          loading={initiating}
          fullWidth
        />
      </Card>

      {/* Step 2: 4-Digit OTP Verification Modal */}
      <Modal
        visible={Boolean(otpSession)}
        transparent
        animationType="fade"
        onRequestClose={() => setOtpSession(null)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={type.h2}>Verify OTP</Text>
                  <Text style={[type.caption, { marginTop: 2 }]}>
                    {activeGateway.bnName} ({otpSession?.senderNumber}) নম্বরে পাঠানো ৪-ডিজিট ওটিপি লিখুন
                  </Text>
                </View>
                <Pressable
                  onPress={() => setOtpSession(null)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Close OTP verification"
                >
                  <AppIcon name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              {otpSession?.devOtp ? (
                <Pressable
                  onPress={() => setOtpInput(otpSession.devOtp ?? '1234')}
                  accessibilityRole="button"
                  accessibilityLabel={`Use preview OTP ${otpSession.devOtp}`}
                  style={styles.devOtpBar}
                >
                  <Text style={styles.devOtpText}>
                    Preview OTP: {otpSession.devOtp} (tap to fill)
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.summaryBox}>
                <SummaryRow
                  label="Payment source"
                  value={`${activeGateway.name} (${activeGateway.bnName})`}
                  showDivider
                />
                <SummaryRow label="Sender" value={otpSession?.senderNumber ?? ''} showDivider />
                <SummaryRow
                  label="Amount"
                  value={formatBdt(otpSession?.amount ?? 0)}
                  tone="strong"
                />
              </View>

              {otpError ? (
                <NoticeCard tone="danger" title="OTP verification failed" message={otpError} />
              ) : null}

              <TextInput
                value={otpInput}
                onChangeText={(v) => setOtpInput(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                maxLength={4}
                accessibilityLabel="4-digit OTP code"
                style={styles.otpInput}
              />

              <Text style={styles.resendTimerText}>
                {resendTimer > 0
                  ? `Code expires in ${resendTimer}s`
                  : 'Need a new code? Cancel and request again.'}
              </Text>

              <View style={styles.modalActions}>
                <SecondaryButton
                  title="Cancel"
                  onPress={() => setOtpSession(null)}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  title="Verify OTP"
                  onPress={handleVerifyOtp}
                  loading={verifyingOtp}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Step 3: 10-Minute Hold Processing Status Modal */}
      <Modal
        visible={Boolean(verifiedHold)}
        transparent
        animationType="fade"
        onRequestClose={() => setVerifiedHold(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.holdIconCircle}>
              <AppIcon name="clock" size={22} color={colors.warning} />
            </View>
            <Text style={styles.holdModalHeading}>Add Money processing</Text>
            <Text style={styles.holdModalSub}>{PROCESSING_NOTICE}</Text>

            {verifiedHold ? (
              <View style={styles.summaryBox}>
                <SummaryRow
                  label="Reference"
                  value={verifiedHold.transaction.trxId}
                  tone="strong"
                  showDivider
                />
                <SummaryRow
                  label="Source"
                  value={verifiedHold.transaction.paymentGateway}
                  showDivider
                />
                <SummaryRow
                  label="Amount"
                  value={formatBdt(verifiedHold.transaction.amount)}
                  tone="strong"
                  showDivider
                />
                <SummaryRow
                  label="Estimated release"
                  value={formatCountdown(verifiedHold.scheduledReleaseAt, nowMs)}
                  tone="discount"
                />
              </View>
            ) : null}

            {verifiedHold ? (
              <PrimaryButton
                title="Simulate instant settlement"
                onPress={() => handleCompleteNow(verifiedHold.transaction.trxId)}
                loading={completingNow}
                fullWidth
              />
            ) : null}
            <View style={{ height: spacing.sm }} />
            <SecondaryButton
              title="Back to Home"
              onPress={() => {
                setVerifiedHold(null);
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
  holdActionLink: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  devOtpBar: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  devOtpText: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  summaryBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  otpInput: {
    fontFamily: baseFontFamily,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 10,
  },
  resendTimerText: {
    fontFamily: baseFontFamily,
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  holdIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 84, 0.30)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  holdModalHeading: {
    ...type.h2,
    textAlign: 'center',
  },
  holdModalSub: {
    ...type.caption,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
});

export default withSession(AddMoneyScreen, '/add-money' satisfies ProtectedRoute);
