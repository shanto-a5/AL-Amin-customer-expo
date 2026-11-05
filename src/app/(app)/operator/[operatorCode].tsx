import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  Keyboard,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Switch,
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
  StatusIndicator,
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
import { formatCountdown } from '@/utils/countdown';

const QUICK_AMOUNTS = [50, 100, 200, 500];
const BD_PHONE_RE = /^01[3-9]\d{8}$/;

function createClientExtRefNum(operator: OperatorCode): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `EXT-${operator}-${ts}-${rand}`;
}

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
  const [pendingExtRefNum, setPendingExtRefNum] = React.useState<string>('');

  const [receipt, setReceipt] = React.useState<RechargeReceipt | null>(null);
  const [copiedNotice, setCopiedNotice] = React.useState(false);
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  // Live timer tick and auto-refresh while recharge is waiting for admin fulfillment
  const activeReceiptStatus = receipt?.status ?? receipt?.transaction?.status;
  const isWaitingAdmin = activeReceiptStatus === 'PENDING_DEBIT' || activeReceiptStatus === 'PROCESSING';

  React.useEffect(() => {
    if (!receipt || !isWaitingAdmin) return;
    let pollCount = 0;
    const timer = setInterval(async () => {
      setNowMs(Date.now());
      pollCount += 1;
      if (pollCount % 3 === 0) {
        try {
          const res = await vantaApi.transactions({ limit: 8 });
          const matched = res.transactions.find((t) => t.trxId === receipt.trxId || t.extRefNum === receipt.extRefNum);
          if (matched && matched.status !== 'PENDING_DEBIT' && matched.status !== 'PROCESSING') {
            setReceipt((prev) => prev ? {
              ...prev,
              status: matched.status,
              balanceAfter: matched.metadata?.balanceAfter ?? prev.balanceAfter,
              transaction: { ...prev.transaction, status: matched.status },
            } : null);
            await session.refresh();
          }
        } catch {
          // ignore network polling hiccups
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [receipt, isWaitingAdmin, session]);
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
    ? Math.trunc(selectedOffer.price)
    : Number.parseInt(amountInput.replace(/\D/g, ''), 10) || 0;

  // Detect if the user's exact integer custom amount matches an active bundle denomination
  const matchedBundleByAmount = React.useMemo(() => {
    if (selectedOffer || numericAmount <= 0) return null;
    return offers.find((o) => o.isActive && Math.trunc(o.price) === numericAmount) ?? null;
  }, [selectedOffer, numericAmount, offers]);

  // Distinct active bundle denominations for quick reference
  const bundleDenominations = React.useMemo(() => {
    const prices = Array.from(new Set(offers.filter((o) => o.isActive).map((o) => Math.trunc(o.price))));
    return prices.sort((a, b) => a - b).slice(0, 5);
  }, [offers]);

  const detectedOp = detectOperatorFromPhone(targetPhone);
  const prefixDiffersFromSelected =
    targetPhone.length >= 3 && detectedOp !== null && detectedOp !== activeOpCode;
  const prefixMismatch = prefixDiffersFromSelected && !mnpOverride;

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
    setAmountInput(String(Math.trunc(offer.price)));
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
        `This number uses a ${OPERATORS[detectedOp!].name} prefix (${cleanPhone.slice(0, 3)}). Toggle "Manual Operator Override (MNP)" below to route it to ${operator.name}, or switch to ${OPERATORS[detectedOp!].name}.`,
      );
      return;
    }

    if (!Number.isInteger(numericAmount) || numericAmount < 10 || numericAmount > 10000) {
      setFormError('Flexiload / bundle amount must be an exact whole integer between ৳10 and ৳10,000.');
      return;
    }

    if (numericAmount > userBalance) {
      setFormError(
        `Insufficient wallet balance (${formatBdt(userBalance)} available, ${formatBdt(numericAmount)} required). Please Add Money first.`,
      );
      return;
    }

    setPendingExtRefNum(createClientExtRefNum(activeOpCode));
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

    const effectiveOffer = selectedOffer ?? matchedBundleByAmount;
    const extRefNum = pendingExtRefNum || createClientExtRefNum(activeOpCode);

    setSubmitting(true);
    try {
      const result = await vantaApi.recharge({
        operator: activeOpCode,
        targetPhone: targetPhone.trim(),
        amount: numericAmount,
        pin: cleanPin,
        type: effectiveOffer ? 'OFFER_PURCHASE' : 'FLEXILOAD',
        offerId: effectiveOffer ? effectiveOffer.id : null,
        extRefNum,
        mnpOverride: mnpOverride || prefixDiffersFromSelected,
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
      receipt.extRefNum ? `Aggregator EXTREFNUM: ${receipt.extRefNum}` : null,
      `Status: ${receipt.status ?? receipt.transaction?.status ?? 'COMPLETED'}`,
      `Operator: ${operator.name} (${operator.bnName})${mnpOverride ? ' [MNP Override]' : ''}`,
      `Recipient: ${receipt.targetPhone}`,
      `Package: ${receipt.offerTitle || 'Flexiload Recharge'}`,
      `Amount: ${formatBdt(receipt.amount)}`,
      `New Balance: ${formatBdt(receipt.balanceAfter, true)}`,
      `Time: ${new Date(receipt.createdAt).toLocaleString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({ message: text });
    } catch {
      // Ignore cancellation
    }
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  const receiptIsPendingDebit =
    (receipt?.status ?? receipt?.transaction?.status) === 'PENDING_DEBIT';

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
          if (targetPhone.length >= 3 && detectOperatorFromPhone(targetPhone) !== code) {
            setMnpOverride(true);
          }
          router.replace({ pathname: '/operator/[operatorCode]', params: { operatorCode: code } });
        }}
      />

      {/* Restrained Selected Operator Header Row */}
      <View style={styles.operatorIdentityRow}>
        <View style={[styles.operatorSymbol, { backgroundColor: operator.softBg }]}>
          <Image source={operator.logo} style={styles.operatorLogoImg} resizeMode="contain" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.operatorIdentityTitle}>
            {operator.name} <Text style={styles.operatorIdentityBn}>· {operator.bnName}</Text>
          </Text>
          <Text style={styles.operatorIdentityMeta}>{operator.tagline}</Text>
        </View>
        {mnpOverride ? (
          <View style={styles.mnpActiveBadge}>
            <Text style={styles.mnpActiveBadgeText}>MNP OVERRIDE</Text>
          </View>
        ) : null}
      </View>

      {formError ? (
        <NoticeCard
          tone="danger"
          title="Check recharge details"
          message={formError}
          actionLabel={prefixMismatch ? `Enable MNP Override for ${operator.name}` : undefined}
          onAction={
            prefixMismatch
              ? () => {
                  setMnpOverride(true);
                  setFormError(null);
                }
              : undefined
          }
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
                const digits = v.replace(/\D/g, '').slice(0, 11);
                setTargetPhone(digits);
                setFormError(null);
                const autoOp = detectOperatorFromPhone(digits);
                if (digits.length >= 3 && autoOp && autoOp !== activeOpCode && !mnpOverride) {
                  // Auto-route to detected operator unless MNP override is enabled
                  router.replace({
                    pathname: '/operator/[operatorCode]',
                    params: { operatorCode: autoOp },
                  });
                }
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

        {/* Manual Operator Override (MNP) Toggle Card */}
        <View style={[styles.mnpCard, mnpOverride && styles.mnpCardActive]}>
          <View style={styles.mnpHeaderRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.mnpTitle}>Manual Operator Override (MNP)</Text>
              <Text style={styles.mnpText}>
                নম্বর পোর্ট (MNP) করা থাকলে প্রিফিক্স লক বাইপাস করে {operator.bnName} নেটওয়ার্কে রিচার্জ করুন
              </Text>
            </View>
            <Switch
              value={mnpOverride}
              onValueChange={(val) => {
                setMnpOverride(val);
                setFormError(null);
              }}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Toggle Manual Operator Override for MNP ported numbers"
            />
          </View>

          {mnpOverride || prefixDiffersFromSelected ? (
            <View style={styles.mnpOperatorPillsRow}>
              {OPERATOR_LIST.map((op) => {
                const selected = op.code === activeOpCode;
                return (
                  <Pressable
                    key={op.code}
                    onPress={() => {
                      setMnpOverride(true);
                      setFormError(null);
                      if (op.code !== activeOpCode) {
                        router.replace({
                          pathname: '/operator/[operatorCode]',
                          params: { operatorCode: op.code },
                        });
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.mnpOpPill,
                      selected && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primarySoft,
                      },
                    ]}
                  >
                    <Image source={op.logo} style={styles.mnpOpLogo} resizeMode="contain" />
                    <Text
                      style={[
                        styles.mnpOpPillText,
                        selected && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {op.code}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {/* Quick Amount Chips & Custom Exact Integer Amount Input */}
        {!selectedOffer ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.inputLabel}>
              Exact integer amount · টাকার পরিমাণ (৳10 – ৳10,000)
            </Text>
            <View style={styles.quickChipsRow}>
              {QUICK_AMOUNTS.map((amt) => {
                const active = numericAmount === amt;
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

            {/* Bundle Denomination Quick Chips */}
            {bundleDenominations.length > 0 ? (
              <View style={styles.bundleDenomRow}>
                <Text style={styles.bundleDenomLabel}>Bundle denominations:</Text>
                <View style={styles.bundleDenomChipsWrap}>
                  {bundleDenominations.map((price) => {
                    const active = numericAmount === price;
                    return (
                      <Pressable
                        key={price}
                        onPress={() => setAmountInput(String(price))}
                        accessibilityRole="button"
                        accessibilityLabel={`Select bundle denomination ${price} Taka`}
                        style={[styles.bundleDenomChip, active && styles.bundleDenomChipActive]}
                      >
                        <Text
                          style={[
                            styles.bundleDenomChipText,
                            active && styles.bundleDenomChipTextActive,
                          ]}
                        >
                          ৳{price}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

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
                accessibilityLabel="Exact integer recharge amount in Taka"
                style={styles.amountInput}
              />
            </View>

            {/* Auto-Detected Bundle Denomination Match Banner */}
            {matchedBundleByAmount ? (
              <Pressable
                onPress={() => handleSelectOffer(matchedBundleByAmount)}
                accessibilityRole="button"
                accessibilityLabel={`Bundle denomination matched: ${matchedBundleByAmount.title}`}
                style={styles.matchedBundleBanner}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.matchedBundleBadge}>
                    BUNDLE DENOMINATION MATCHED · ৳{matchedBundleByAmount.price}
                  </Text>
                  <Text style={styles.matchedBundleTitle}>{matchedBundleByAmount.title}</Text>
                  <Text style={styles.matchedBundleSub}>
                    {matchedBundleByAmount.category} · {matchedBundleByAmount.validity} — will trigger bundle pack automatically
                  </Text>
                </View>
                <View style={styles.matchedBundleSelectPill}>
                  <Text style={styles.matchedBundleSelectText}>Lock Pack</Text>
                </View>
              </Pressable>
            ) : null}
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
                  value={`${operator.name} (${operator.bnName})${mnpOverride ? ' · MNP' : ''}`}
                  showDivider
                />
                <SummaryRow label="Recipient" value={targetPhone} showDivider />
                <SummaryRow
                  label="Service"
                  value={
                    selectedOffer
                      ? selectedOffer.title
                      : matchedBundleByAmount
                        ? `${matchedBundleByAmount.title} (৳${matchedBundleByAmount.price} Denom)`
                        : 'Flexiload recharge'
                  }
                  showDivider
                />
                {pendingExtRefNum ? (
                  <SummaryRow label="EXTREFNUM" value={pendingExtRefNum} tone="muted" showDivider />
                ) : null}
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

              <Text style={styles.inputLabel}>4-digit PIN</Text>

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
            <View
              style={[
                styles.receiptIconCircle,
                receiptIsPendingDebit && {
                  backgroundColor: colors.warningSoft,
                  borderColor: 'rgba(234, 179, 84, 0.40)',
                },
              ]}
            >
              <AppIcon
                name={receiptIsPendingDebit ? 'clock' : 'check'}
                size={22}
                color={receiptIsPendingDebit ? colors.warning : colors.success}
              />
            </View>
            <Text style={styles.receiptHeading}>
              {activeReceiptStatus === 'COMPLETED'
                ? 'Recharge completed'
                : activeReceiptStatus === 'FAILED'
                  ? 'Recharge rejected'
                  : 'Recharge processing � ?????????'}
            </Text>
            <Text style={styles.receiptSubheading}>
              {activeReceiptStatus === 'COMPLETED'
                ? "Your recharge is complete. It's done."
                : activeReceiptStatus === 'FAILED'
                  ? 'Recharge rejected by admin. Balance has been refunded to your wallet.'
                  : '???????? ????? ???? ?? ? ??????? ????? ??????? ??????? ????'}
            </Text>
            {isWaitingAdmin ? (
              <View style={styles.timerBadgeBox}>
                <Text style={styles.timerBadgeLabel}>Approval countdown</Text>
                <Text style={styles.timerBadgeValue}>
                  {formatCountdown(receipt?.expiresAt || receipt?.transaction?.expiresAt, nowMs)}
                </Text>
              </View>
            ) : null}

            {receipt ? (
              <View style={styles.summaryBox}>
                <View style={styles.receiptStatusRow}>
                  <Text style={styles.receiptStatusLabel}>Ledger Status</Text>
                  <StatusIndicator
                    status={receipt.status ?? receipt.transaction?.status ?? 'COMPLETED'}
                  />
                </View>
                <SummaryRow label="Reference" value={receipt.trxId} tone="strong" showDivider />
                {receipt.extRefNum ? (
                  <SummaryRow
                    label="EXTREFNUM"
                    value={receipt.extRefNum}
                    tone="muted"
                    showDivider
                  />
                ) : null}
                <SummaryRow
                  label="Operator"
                  value={`${operator.name} (${operator.bnName})${mnpOverride ? ' · MNP' : ''}`}
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
  timerBadgeBox: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 84, 0.35)',
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  timerBadgeLabel: {
    fontFamily: baseFontFamily,
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timerBadgeValue: {
    fontFamily: baseFontFamily,
    fontSize: 22,
    fontWeight: '800',
    color: colors.warning,
    marginTop: 2,
  },
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  operatorLogoImg: {
    width: 26,
    height: 26,
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
  mnpActiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  mnpActiveBadgeText: {
    fontFamily: baseFontFamily,
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.4,
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
    color: '#FFFFFF',
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
    backgroundColor: '#000000',
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

  mnpCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    gap: 10,
  },
  mnpCardActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  mnpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mnpTitle: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
  },
  mnpText: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: 2,
  },
  mnpOperatorPillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 4,
  },
  mnpOpPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#000000',
  },
  mnpOpLogo: {
    width: 14,
    height: 14,
  },
  mnpOpPillText: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
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

  bundleDenomRow: {
    marginBottom: 10,
    gap: 6,
  },
  bundleDenomLabel: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textFaint,
  },
  bundleDenomChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bundleDenomChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#000000',
  },
  bundleDenomChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  bundleDenomChipText: {
    fontFamily: baseFontFamily,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  bundleDenomChipTextActive: {
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

  matchedBundleBanner: {
    marginTop: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  matchedBundleBadge: {
    fontFamily: baseFontFamily,
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  matchedBundleTitle: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  matchedBundleSub: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  matchedBundleSelectPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.xs,
    backgroundColor: colors.primary,
  },
  matchedBundleSelectText: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
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
  receiptStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  receiptStatusLabel: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    color: colors.textMuted,
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
