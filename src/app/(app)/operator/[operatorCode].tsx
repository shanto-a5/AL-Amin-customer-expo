import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  AccessibilityInfo,
  Animated,
  Keyboard,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { vantaApi, type RechargeReceipt } from '@/api/vanta-api';
import {
  OfferRow,
  PageHeader,
  WalletMiniPill,
} from '@/components/fintech-ui';
import {
  AppIcon,
  Card,
  EmptyState,
  FilterTabs,
  LoadingSkeleton,
  NoticeCard,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
  SummaryRow,
} from '@/components/ui';
import type { OfferCategory, OfferDto } from '@/domain/types';
import { withSession } from '@/modules/session/route-guard';
import type { SessionContextValue } from '@/modules/session/session-context';
import {
  baseFontFamily,
  colors,
  detectOperatorFromPhone,
  formatBdt,
  OPERATORS,
  OPERATOR_LIST,
  radius,
  spacing,
  type,
  type OperatorCode,
} from '@/theme/tokens';

const QUICK_AMOUNTS = [50, 100, 200, 500];
const BD_PHONE_RE = /^01[3-9]\d{8}$/;

function OperatorHubScreen({ session }: { session: SessionContextValue }): React.JSX.Element {
  const params = useLocalSearchParams<{ operatorCode?: string; offerId?: string }>();
  const rawOp = (params.operatorCode ?? 'GP').toUpperCase() as OperatorCode;
  const activeOpCode: OperatorCode = OPERATORS[rawOp] ? rawOp : 'GP';
  const operator = OPERATORS[activeOpCode];

  const [targetPhone, setTargetPhone] = React.useState('');
  const [phoneFocused, setPhoneFocused] = React.useState(false);
  const [amountFocused, setAmountFocused] = React.useState(false);
  const [mnpOverride, setMnpOverride] = React.useState(false);
  const [amountInput, setAmountInput] = React.useState('100');
  const [selectedOffer, setSelectedOffer] = React.useState<OfferDto | null>(null);

  const [offers, setOffers] = React.useState<OfferDto[]>([]);
  const [loadingOffers, setLoadingOffers] = React.useState(true);
  const [categoryFilter, setCategoryFilter] = React.useState<'ALL' | OfferCategory>('ALL');

  const [formError, setFormError] = React.useState<string | null>(null);
  const [pinModalOpen, setPinModalOpen] = React.useState(false);
  const [pinInput, setPinInput] = React.useState('');
  const [pinError, setPinError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [receipt, setReceipt] = React.useState<RechargeReceipt | null>(null);
  const [copiedNotice, setCopiedNotice] = React.useState(false);
  const [receiptScale] = React.useState(() => new Animated.Value(1));

  const userBalance = session.user?.balance ?? 0;

  React.useEffect(() => {
    let mounted = true;
    vantaApi
      .offers({ operator: activeOpCode })
      .then((res) => {
        if (!mounted) return;
        setOffers(res.offers);
        if (params.offerId) {
          const found = res.offers.find((o) => o.id === params.offerId);
          if (found) {
            setSelectedOffer(found);
            setAmountInput(String(found.price));
          }
        }
      })
      .catch(() => {
        if (mounted) setOffers([]);
      })
      .finally(() => {
        if (mounted) setLoadingOffers(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeOpCode, params.offerId]);

  const numericAmount = selectedOffer
    ? selectedOffer.price
    : Number.parseFloat(amountInput.replace(/[^\d.]/g, '')) || 0;

  const detectedOp = detectOperatorFromPhone(targetPhone);
  const prefixMismatch =
    targetPhone.length >= 3 && detectedOp !== null && detectedOp !== activeOpCode && !mnpOverride;

  const filteredOffers = React.useMemo(() => {
    if (categoryFilter === 'ALL') return offers;
    return offers.filter((o) => o.category === categoryFilter);
  }, [offers, categoryFilter]);

  const handleSelectOffer = (offer: OfferDto) => {
    setFormError(null);
    if (selectedOffer?.id === offer.id) {
      setSelectedOffer(null);
      setAmountInput('100');
      return;
    }
    setSelectedOffer(offer);
    setAmountInput(String(offer.price));
  };

  const handleProceedToPin = () => {
    setFormError(null);
    const cleanPhone = targetPhone.trim();

    if (!BD_PHONE_RE.test(cleanPhone)) {
      setFormError(
        'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX) · Enter a valid 11-digit BD mobile number.',
      );
      return;
    }

    if (prefixMismatch) {
      setFormError(
        `This number uses a ${OPERATORS[detectedOp!].name} prefix. Enable MNP ported number below if it was ported to ${operator.name}.`,
      );
      return;
    }

    if (!selectedOffer && (numericAmount < 10 || numericAmount > 10000)) {
      setFormError('Flexiload amount must be between ৳10 and ৳10,000.');
      return;
    }

    if (numericAmount > userBalance) {
      setFormError(
        `Insufficient wallet balance (${formatBdt(userBalance)} available, ${formatBdt(numericAmount)} required). Please Add Money first.`,
      );
      return;
    }

    setPinInput('');
    setPinError(null);
    setPinModalOpen(true);
  };

  const handleConfirmPinRecharge = async () => {
    setPinError(null);
    const cleanPin = pinInput.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      setPinError('Enter your 4-digit security PIN.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await vantaApi.recharge({
        operator: activeOpCode,
        targetPhone: targetPhone.trim(),
        amount: numericAmount,
        pin: cleanPin,
        type: selectedOffer ? 'OFFER_PURCHASE' : 'FLEXILOAD',
        offerId: selectedOffer ? selectedOffer.id : null,
      });
      await session.refresh();
      setPinModalOpen(false);

      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      if (reduceMotion) {
        receiptScale.setValue(1);
        setReceipt(result);
      } else {
        receiptScale.setValue(0.95);
        setReceipt(result);
        Animated.spring(receiptScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
        }).start();
      }
    } catch (error) {
      setPinError(
        error instanceof Error ? error.message : 'Transaction failed. Please verify your PIN.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareReceipt = async () => {
    if (!receipt) return;
    const text = [
      'AllPay BD (অল পে বিডি) — Recharge Receipt',
      `Reference: ${receipt.trxId}`,
      `Operator: ${operator.name} (${operator.bnName})`,
      `Recipient: ${receipt.targetPhone}`,
      `Package: ${receipt.offerTitle || 'Flexiload Recharge'}`,
      `Amount: ${formatBdt(receipt.amount)}`,
      `New Balance: ${formatBdt(receipt.balanceAfter, true)}`,
      `Time: ${new Date(receipt.createdAt).toLocaleString()}`,
    ].join('\n');

    try {
      await Share.share({ message: text });
    } catch {
      // Ignore cancellation
    }
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  return (
    <Screen padded>
      <PageHeader
        backFallbackHref="/home"
        rightAccessory={<WalletMiniPill balance={userBalance} />}
        title="Mobile recharge"
        subtitle="মোবাইল রিচার্জ এবং ইন্টারনেট বা মিনিট প্যাক কিনুন"
      />

      {/* Compact Operator Switcher */}
      <FilterTabs
        tabs={OPERATOR_LIST.map((op) => ({
          key: op.code,
          label: op.name,
          accentColor: op.color,
        }))}
        active={activeOpCode}
        onChange={(code) => {
          if (code === activeOpCode) return;
          setSelectedOffer(null);
          setFormError(null);
          setLoadingOffers(true);
          router.replace({ pathname: '/operator/[operatorCode]', params: { operatorCode: code } });
        }}
      />

      {/* Restrained Selected Operator Header Row */}
      <View style={styles.operatorIdentityRow}>
        <View style={[styles.operatorSymbol, { backgroundColor: operator.softBg }]}>
          <Text style={[styles.operatorSymbolText, { color: operator.color }]}>
            {operator.symbolLabel}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.operatorIdentityTitle}>
            {operator.name} <Text style={styles.operatorIdentityBn}>· {operator.bnName}</Text>
          </Text>
          <Text style={styles.operatorIdentityMeta}>{operator.tagline}</Text>
        </View>
      </View>

      {formError ? (
        <NoticeCard
          tone="danger"
          title="Check recharge details"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      ) : null}

      {/* Recharge / Offer Purchase Form Card */}
      <Card style={styles.formCard}>
        <View style={styles.formCardHeader}>
          <Text style={type.h3}>
            {selectedOffer ? 'Selected package' : 'Flexiload recharge'}
          </Text>
          {selectedOffer ? (
            <Pressable
              onPress={() => {
                setSelectedOffer(null);
                setAmountInput('100');
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Switch back to custom Flexiload amount"
              style={styles.clearOfferBtn}
            >
              <Text style={styles.clearOfferText}>Switch to Flexiload</Text>
            </Pressable>
          ) : null}
        </View>

        {selectedOffer ? (
          <View style={styles.selectedOfferSummary}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.selectedOfferTitle}>{selectedOffer.title}</Text>
              <Text style={styles.selectedOfferMeta}>
                {selectedOffer.category} · Valid for {selectedOffer.validity}
              </Text>
            </View>
            <Text style={styles.selectedOfferPrice}>{formatBdt(selectedOffer.price)}</Text>
          </View>
        ) : null}

        {/* Recipient Mobile Input */}
        <Text style={styles.inputLabel}>Recipient mobile number · প্রাপকের নম্বর</Text>
        <View style={styles.phoneInputRow}>
          <View
            style={[
              styles.phoneInputBox,
              phoneFocused && styles.inputBoxFocused,
            ]}
          >
            <TextInput
              value={targetPhone}
              onChangeText={(v) => {
                setTargetPhone(v.replace(/\D/g, '').slice(0, 11));
                setFormError(null);
              }}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              placeholder={`${operator.prefixes[0]}XXXXXXXX`}
              placeholderTextColor={colors.textFaint}
              keyboardType="phone-pad"
              maxLength={11}
              accessibilityLabel="Recipient 11-digit mobile number"
              style={styles.phoneInput}
            />
          </View>
          {session.user?.phone ? (
            <Pressable
              onPress={() => {
                setTargetPhone(session.user?.phone ?? '');
                setMnpOverride(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Use my mobile number"
              style={({ pressed }) => [styles.myNumberBtn, pressed && { opacity: 0.78 }]}
            >
              <Text style={styles.myNumberBtnText}>My number</Text>
            </Pressable>
          ) : null}
        </View>

        {/* MNP Ported Number Toggle */}
        <Pressable
          onPress={() => setMnpOverride((prev) => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: mnpOverride }}
          style={styles.mnpRow}
        >
          <View style={[styles.checkbox, mnpOverride && styles.checkboxChecked]}>
            {mnpOverride ? (
              <AppIcon name="check" size={12} color={colors.textInverse} />
            ) : null}
          </View>
          <Text style={styles.mnpText}>
            MNP ported number (অন্য অপারেটর থেকে {operator.bnName}-এ পোর্টেড)
          </Text>
        </Pressable>

        {/* Quick Amount Chips & Custom Amount Input */}
        {!selectedOffer ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.inputLabel}>Amount · টাকার পরিমাণ (৳10 – ৳10,000)</Text>
            <View style={styles.quickChipsRow}>
              {QUICK_AMOUNTS.map((amt) => {
                const active = Number(amountInput) === amt;
                return (
                  <Pressable
                    key={amt}
                    onPress={() => setAmountInput(String(amt))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.amountChip, active && styles.amountChipActive]}
                  >
                    <Text style={[styles.amountChipText, active && styles.amountChipTextActive]}>
                      ৳{amt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View
              style={[
                styles.amountInputBox,
                amountFocused && styles.inputBoxFocused,
              ]}
            >
              <Text style={styles.amountCurrencyPrefix}>৳</Text>
              <TextInput
                value={amountInput}
                onChangeText={(v) => setAmountInput(v.replace(/\D/g, '').slice(0, 5))}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
                placeholder="100"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                accessibilityLabel="Recharge amount in Taka"
                style={styles.amountInput}
              />
            </View>
          </View>
        ) : null}

        <View style={{ height: spacing.lg }} />
        <PrimaryButton
          title={`Continue · ${formatBdt(numericAmount)}`}
          onPress={handleProceedToPin}
          fullWidth
        />
      </Card>

      {/* Operator Bundles List */}
      <View style={styles.offersSection}>
        <SectionHeader
          title={`${operator.name} bundles`}
          caption="অফারে ট্যাপ করলে প্যাকটি সরাসরি সিলেক্ট হবে"
        />

        <FilterTabs
          tabs={[
            { key: 'ALL', label: 'All', count: offers.length },
            { key: 'INTERNET', label: 'Internet' },
            { key: 'COMBO', label: 'Combo' },
            { key: 'MINUTES', label: 'Minutes' },
          ]}
          active={categoryFilter}
          onChange={(k) => setCategoryFilter(k as 'ALL' | OfferCategory)}
        />

        {loadingOffers ? (
          <LoadingSkeleton rows={3} height={84} />
        ) : filteredOffers.length === 0 ? (
          <EmptyState
            title="No packages in this category"
            message="Select another category filter above."
          />
        ) : (
          <View style={styles.offerList}>
            {filteredOffers.map((offer) => {
              const isSelected = selectedOffer?.id === offer.id;
              return (
                <OfferRow
                  key={offer.id}
                  offer={offer}
                  showOperator={false}
                  selected={isSelected}
                  actionLabel={isSelected ? 'Selected ✓' : 'Select →'}
                  onPress={() => handleSelectOffer(offer)}
                />
              );
            })}
          </View>
        )}
      </View>

      {/* 4-Digit Security PIN Verification Modal */}
      <Modal
        visible={pinModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={type.h2}>Confirm with PIN</Text>
                  <Text style={[type.caption, { marginTop: 2 }]}>
                    আপনার ৪-ডিজিট গোপন পিন দিয়ে লেনদেন নিশ্চিত করুন
                  </Text>
                </View>
                <Pressable
                  onPress={() => setPinModalOpen(false)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Close PIN confirmation"
                >
                  <AppIcon name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.summaryBox}>
                <SummaryRow
                  label="Operator"
                  value={`${operator.name} (${operator.bnName})`}
                  showDivider
                />
                <SummaryRow label="Recipient" value={targetPhone} showDivider />
                <SummaryRow
                  label="Service"
                  value={selectedOffer ? selectedOffer.title : 'Flexiload recharge'}
                  showDivider
                />
                <SummaryRow
                  label="Total amount"
                  value={formatBdt(numericAmount)}
                  tone="strong"
                  showDivider
                />
                <SummaryRow
                  label="Balance after"
                  value={formatBdt(Math.max(0, userBalance - numericAmount), true)}
                  tone="discount"
                />
              </View>

              {pinError ? (
                <NoticeCard tone="danger" title="PIN verification error" message={pinError} />
              ) : null}

              <View style={styles.pinLabelRow}>
                <Text style={styles.inputLabel}>4-digit PIN</Text>
                <Pressable
                  onPress={() => setPinInput('1234')}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Autofill demo PIN 1234"
                  style={styles.demoPinChip}
                >
                  <Text style={styles.demoPinChipText}>Demo PIN: 1234</Text>
                </Pressable>
              </View>

              <TextInput
                value={pinInput}
                onChangeText={(v) => setPinInput(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                accessibilityLabel="4-digit security PIN"
                style={styles.pinInputBox}
                autoFocus
              />

              <View style={styles.modalActions}>
                <SecondaryButton
                  title="Cancel"
                  onPress={() => setPinModalOpen(false)}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  title="Confirm"
                  onPress={handleConfirmPinRecharge}
                  loading={submitting}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Digital Receipt Modal */}
      <Modal
        visible={Boolean(receipt)}
        transparent
        animationType="fade"
        onRequestClose={() => setReceipt(null)}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.receiptDialog, { transform: [{ scale: receiptScale }] }]}>
            <View style={styles.receiptIconCircle}>
              <AppIcon name="check" size={22} color={colors.success} />
            </View>
            <Text style={styles.receiptHeading}>Recharge completed</Text>
            <Text style={styles.receiptSubheading}>
              রিচার্জ সফল হয়েছে · Verified digital receipt
            </Text>

            {receipt ? (
              <View style={styles.summaryBox}>
                <SummaryRow label="Reference" value={receipt.trxId} tone="strong" showDivider />
                <SummaryRow
                  label="Operator"
                  value={`${operator.name} (${operator.bnName})`}
                  showDivider
                />
                <SummaryRow label="Recipient" value={receipt.targetPhone} showDivider />
                <SummaryRow
                  label="Package"
                  value={receipt.offerTitle || 'Flexiload recharge'}
                  showDivider
                />
                <SummaryRow
                  label="Amount"
                  value={formatBdt(receipt.amount)}
                  tone="strong"
                  showDivider
                />
                <SummaryRow
                  label="New balance"
                  value={formatBdt(receipt.balanceAfter, true)}
                  tone="discount"
                  showDivider
                />
                <SummaryRow
                  label="Time"
                  value={new Date(receipt.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  tone="muted"
                />
              </View>
            ) : null}

            {copiedNotice ? (
              <Text style={styles.copiedText}>Receipt ready to share</Text>
            ) : null}

            <View style={styles.modalActions}>
              <SecondaryButton
                title="Share"
                icon="share"
                onPress={handleShareReceipt}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="Back to Home"
                onPress={() => {
                  setReceipt(null);
                  router.replace('/home');
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  operatorIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  operatorSymbol: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operatorSymbolText: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    fontWeight: '800',
  },
  operatorIdentityTitle: {
    fontFamily: baseFontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.text,
  },
  operatorIdentityBn: {
    fontWeight: '500',
    color: colors.textMuted,
  },
  operatorIdentityMeta: {
    fontFamily: baseFontFamily,
    fontSize: 11.5,
    color: colors.textFaint,
    marginTop: 2,
  },

  formCard: {
    marginBottom: 8,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  clearOfferBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  clearOfferText: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  selectedOfferSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 13,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: 14,
  },
  selectedOfferTitle: {
    fontFamily: baseFontFamily,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.text,
  },
  selectedOfferMeta: {
    fontFamily: baseFontFamily,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 3,
  },
  selectedOfferPrice: {
    fontFamily: baseFontFamily,
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },

  inputLabel: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
    color: '#DCE6F2',
    marginBottom: 6,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneInputBox: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
  },
  inputBoxFocused: {
    borderColor: colors.primary,
    backgroundColor: '#152236',
  },
  phoneInput: {
    fontFamily: baseFontFamily,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.4,
  },
  myNumberBtn: {
    minHeight: 46,
    paddingHorizontal: 13,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myNumberBtnText: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  mnpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 11,
    paddingVertical: 3,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mnpText: {
    fontFamily: baseFontFamily,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textMuted,
    flex: 1,
  },

  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  amountChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  amountChipText: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  amountChipTextActive: {
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
  amountCurrencyPrefix: {
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

  offersSection: {
    marginTop: 24,
  },
  offerList: {
    gap: 10,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalSheet: {
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
  summaryBox: {
    width: '100%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  pinLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  demoPinChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.xs,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  demoPinChipText: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  pinInputBox: {
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
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },

  receiptDialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 22,
    alignItems: 'center',
  },
  receiptIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: 'rgba(53, 201, 148, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  receiptHeading: {
    ...type.h2,
    textAlign: 'center',
  },
  receiptSubheading: {
    ...type.caption,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  copiedText: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 12,
  },
});

export default withSession(OperatorHubScreen);
