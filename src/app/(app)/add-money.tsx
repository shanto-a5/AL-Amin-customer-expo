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
import { BackButton } from '@/components/back-button';
import {
  Button,
  Card,
  NoticeCard,
  Screen,
  SectionHeader,
  SummaryRow,
} from '@/components/ui';
import { withSession, type ProtectedRoute } from '@/modules/session/route-guard';
import type { SessionContextValue } from '@/modules/session/session-context';
import {
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
  'Wait please 10 minutes! আপনার অ্যাড মানি প্রসেসিং হচ্ছে। ১০ মিনিটের মধ্যে মূল অ্যাকাউন্টে ব্যালেন্স যোগ হয়ে যাবে।';

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

  // Resend timer for OTP modal
  React.useEffect(() => {
    if (!otpSession) return;
    setResendTimer(120);
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSession]);

  // Live 10-minute countdown timer
  const pendingAddMoney = session.user?.pendingAddMoney ?? [];
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
      setFormError('সঠিক প্রেরকের বিকাশ/নগদ মোবাইল নম্বর অথবা ব্যাংক অ্যাকাউন্ট নম্বর দিন।');
      return;
    }
    if (numericAmount < 50) {
      setFormError('সর্বনিম্ন অ্যাড মানি পরিমাণ ৳৫০ হতে হবে • Minimum Add Money amount is ৳50.');
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
      setOtpError('৪ ডিজিটের ওটিপি কোড দিন • Enter the 4-digit OTP code.');
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
        `✓ ${formatBdt(res.transaction.amount)} (${res.transaction.paymentGateway}) সফলভাবে আপনার মূল ব্যালেন্সে যোগ হয়েছে! নতুন ব্যালেন্স: ${formatBdt(res.user?.balance ?? session.user?.balance ?? 0, true)}`,
      );
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not complete transaction.');
    } finally {
      setCompletingNow(false);
    }
  };

  return (
    <Screen padded>
      <View style={styles.topRow}>
        <BackButton fallbackHref="/home" />
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceBadgeLabel}>বর্তমান ব্যালেন্স:</Text>
          <Text style={styles.balanceBadgeValue}>{formatBdt(session.user?.balance ?? 0, true)}</Text>
        </View>
      </View>

      <Text style={type.h1}>+ অ্যাড মানি • Add Money</Text>
      <Text style={[type.caption, { marginTop: 2, marginBottom: spacing.md }]}>
        বিকাশ, নগদ অথবা ব্যাংক অ্যাকাউন্ট থেকে আপনার অল পে বিডি ওয়ালেটে টাকা যোগ করুন
      </Text>

      {completedBanner ? (
        <NoticeCard
          tone="success"
          title="অ্যাড মানি সফল হয়েছে • Balance Credited"
          message={completedBanner}
          onDismiss={() => setCompletedBanner(null)}
        />
      ) : null}

      {formError ? (
        <NoticeCard
          tone="danger"
          title="অনুগ্রহ করে যাচাই করুন"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      ) : null}

      {/* Persistent Banner for any active PROCESSING Add Money transactions */}
      {pendingAddMoney.map((trx) => (
        <View key={trx.trxId} style={styles.holdBanner}>
          <Text style={styles.holdWarningTitle}>
            ⚠️ {PROCESSING_NOTICE}
          </Text>
          <View style={styles.holdMetaRow}>
            <View>
              <Text style={styles.holdMetaText}>
                গেটওয়ে: {trx.paymentGateway} • পরিমাণ: {formatBdt(trx.amount)}
              </Text>
              <Text style={styles.holdMetaText}>TrxID: {trx.trxId}</Text>
            </View>
            <View style={styles.holdCountdownBox}>
              <Text style={styles.holdCountdownLabel}>Countdown</Text>
              <Text style={styles.holdCountdownValue}>
                {formatCountdown(trx.scheduledReleaseAt, nowMs)}
              </Text>
            </View>
          </View>
          <Button
            title="⚡ Simulate Instant Complete (Dev/Admin)"
            onPress={() => handleCompleteNow(trx.trxId)}
            loading={completingNow}
            fullWidth
            style={{ marginTop: spacing.sm }}
          />
        </View>
      ))}

      {/* Step 1A: Gateway Selector Cards */}
      <SectionHeader
        title="১. পেমেন্ট গেটওয়ে নির্বাচন করুন • Select Gateway"
        caption="Choose bKash, Nagad, or Bank Account"
      />
      <View style={styles.gatewayRow}>
        {GATEWAY_LIST.map((gw) => {
          const selected = gw.code === gatewayCode;
          return (
            <Pressable
              key={gw.code}
              onPress={() => setGatewayCode(gw.code)}
              accessibilityRole="button"
              accessibilityLabel={`${gw.name} (${gw.bnName})`}
              style={[
                styles.gatewayCard,
                {
                  borderColor: selected ? gw.color : colors.border,
                  backgroundColor: selected ? gw.softBg : colors.surface,
                },
              ]}
            >
              <View style={[styles.gatewayDot, { backgroundColor: gw.color }]} />
              <Text style={styles.gatewayName}>{gw.name}</Text>
              <Text style={[styles.gatewayBn, { color: gw.color }]}>{gw.bnName}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Step 1B: Sender Number & Amount Form */}
      <Card style={{ ...styles.formCard, borderColor: activeGateway.color }}>
        <View style={styles.selectedGatewayHeader}>
          <View style={[styles.gatewayPill, { backgroundColor: activeGateway.color }]}>
            <Text style={styles.gatewayPillText}>{activeGateway.name}</Text>
          </View>
          <Text style={styles.selectedGatewaySub}>{activeGateway.subtitle}</Text>
        </View>

        <Text style={styles.inputLabel}>
          প্রেরকের নম্বর / অ্যাকাউন্ট • Sender {activeGateway.name} Number
        </Text>
        <TextInput
          value={senderNumber}
          onChangeText={setSenderNumber}
          placeholder={activeGateway.placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType="phone-pad"
          style={styles.textInput}
        />

        <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
          টাকার পরিমাণ • Amount (সর্বনিম্ন ৳৫০)
        </Text>
        <View style={styles.quickAmountRow}>
          {QUICK_ADD_AMOUNTS.map((amt) => {
            const active = Number(amountInput) === amt;
            return (
              <Pressable
                key={amt}
                onPress={() => setAmountInput(String(amt))}
                style={[
                  styles.quickChip,
                  active && { backgroundColor: activeGateway.color, borderColor: activeGateway.color },
                ]}
              >
                <Text style={[styles.quickChipText, active && { color: '#FFFFFF', fontWeight: '900' }]}>
                  {formatBdt(amt)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={amountInput}
          onChangeText={(v) => setAmountInput(v.replace(/\D/g, '').slice(0, 6))}
          placeholder="৳ পরিমাণ লিখুন (সর্বনিম্ন ৫০)"
          placeholderTextColor={colors.textFaint}
          keyboardType="number-pad"
          style={styles.amountInput}
        />

        <View style={{ height: spacing.md }} />
        <Button
          title={`ওটিপি ভেরিফাই করুন • Proceed (${formatBdt(numericAmount)})`}
          onPress={handleInitiate}
          loading={initiating}
          fullWidth
          style={{ backgroundColor: activeGateway.color }}
        />
      </Card>

      {/* Step 2: 4-Digit OTP Verification Modal */}
      <Modal
        visible={Boolean(otpSession)}
        transparent
        animationType="slide"
        onRequestClose={() => setOtpSession(null)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
            <Text style={type.h2}>📲 ৪-ডিজিট ওটিপি ভেরিফিকেশন</Text>
            <Text style={[type.caption, { marginTop: 4, marginBottom: spacing.md }]}>
              আপনার {activeGateway.bnName} ({otpSession?.senderNumber}) নম্বরে পাঠানো ৪-ডিজিট ওটিপি কোডটি লিখুন
            </Text>

            {otpSession?.devOtp ? (
              <Pressable
                onPress={() => setOtpInput(otpSession.devOtp ?? '1234')}
                style={styles.devOtpToast}
              >
                <Text style={styles.devOtpToastText}>
                  🧪 টেস্ট প্রিভিউ ওটিপি (Dev OTP): {otpSession.devOtp} (ট্যাপ করে বসান)
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.summaryBox}>
              <SummaryRow label="পেমেন্ট গেটওয়ে (Gateway)" value={`${activeGateway.name} (${activeGateway.bnName})`} />
              <SummaryRow label="প্রেরক নম্বর (Sender)" value={otpSession?.senderNumber ?? ''} />
              <SummaryRow label="পরিমাণ (Amount)" value={formatBdt(otpSession?.amount ?? 0)} tone="strong" />
            </View>

            {otpError ? (
              <NoticeCard tone="danger" title="OTP Error" message={otpError} />
            ) : null}

            <TextInput
              value={otpInput}
              onChangeText={(v) => setOtpInput(v.replace(/\D/g, '').slice(0, 4))}
              placeholder="• • • •"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              maxLength={4}
              style={[styles.otpInput, { borderColor: activeGateway.color }]}
            />

            <Text style={styles.resendTimerText}>
              {resendTimer > 0
                ? `পুনরায় ওটিপি পাঠান: ${resendTimer} সেকেন্ড পর`
                : 'ওটিপি পাননি? পুনরায় চেষ্টা করতে পারেন'}
            </Text>

            <View style={styles.modalActions}>
              <Button
                title="বাতিল • Cancel"
                variant="secondary"
                onPress={() => setOtpSession(null)}
                style={{ flex: 1 }}
              />
              <Button
                title="ভেরিফাই করুন • Verify OTP"
                onPress={handleVerifyOtp}
                loading={verifyingOtp}
                style={{ flex: 1, backgroundColor: activeGateway.color }}
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
          <View style={[styles.modalCard, { borderColor: '#F59E0B' }]}>
            <View style={styles.holdIconCircle}>
              <Text style={{ fontSize: 28 }}>⏳</Text>
            </View>
            <Text style={styles.holdModalHeading}>অ্যাড মানি প্রসেসিং হচ্ছে!</Text>

            <View style={styles.exactWarningBox}>
              <Text style={styles.exactWarningText}>
                ⚠️ &quot;{PROCESSING_NOTICE}&quot;
              </Text>
            </View>

            {verifiedHold ? (
              <View style={styles.summaryBox}>
                <SummaryRow label="TrxID" value={verifiedHold.transaction.trxId} tone="strong" />
                <SummaryRow label="গেটওয়ে (Gateway)" value={verifiedHold.transaction.paymentGateway} />
                <SummaryRow label="পরিমাণ (Amount)" value={formatBdt(verifiedHold.transaction.amount)} tone="strong" />
                <SummaryRow
                  label="সম্ভাব্য সময় (Countdown)"
                  value={formatCountdown(verifiedHold.scheduledReleaseAt, nowMs)}
                  tone="discount"
                />
              </View>
            ) : null}

            {verifiedHold ? (
              <Button
                title="⚡ Simulate Instant Complete (Dev/Admin)"
                onPress={() => handleCompleteNow(verifiedHold.transaction.trxId)}
                loading={completingNow}
                fullWidth
              />
            ) : null}
            <View style={{ height: spacing.sm }} />
            <Button
              title="ড্যাশবোর্ডে ফিরুন • Back to Home"
              variant="secondary"
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  balanceBadgeLabel: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  balanceBadgeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  holdBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  holdWarningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FBBF24',
    lineHeight: 19,
  },
  holdMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  holdMetaText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  holdCountdownBox: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    alignItems: 'center',
  },
  holdCountdownLabel: {
    fontSize: 9.5,
    color: '#FBBF24',
    fontWeight: '700',
  },
  holdCountdownValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  gatewayRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  gatewayCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.md,
    alignItems: 'center',
  },
  gatewayDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  gatewayName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.text,
  },
  gatewayBn: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  formCard: {
    borderWidth: 1.5,
    marginBottom: spacing.xl,
  },
  selectedGatewayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  gatewayPill: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  gatewayPillText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  selectedGatewaySub: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.text,
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
  },
  quickChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: 17,
    fontWeight: '800',
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
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  devOtpToast: {
    backgroundColor: 'rgba(20, 184, 166, 0.16)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  devOtpToastText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  summaryBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  otpInput: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 12,
    marginBottom: spacing.sm,
  },
  resendTimerText: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  holdIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  holdModalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  exactWarningBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  exactWarningText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FBBF24',
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default withSession(AddMoneyScreen, '/add-money' satisfies ProtectedRoute);
