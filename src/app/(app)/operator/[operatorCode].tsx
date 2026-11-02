import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
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
import { BackButton } from '@/components/back-button';
import {
  Button,
  Card,
  FilterTabs,
  NoticeCard,
  Pill,
  Screen,
  SectionHeader,
  SummaryRow,
} from '@/components/ui';
import type { OfferCategory, OfferDto } from '@/domain/types';
import { withSession } from '@/modules/session/route-guard';
import type { SessionContextValue } from '@/modules/session/session-context';
import {
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
  const receiptScale = React.useRef(new Animated.Value(0.85)).current;

  const userBalance = session.user?.balance ?? 0;

  React.useEffect(() => {
    let mounted = true;
    setLoadingOffers(true);
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
      setFormError('সঠিক ১১ ডিজিটের প্রাপক মোবাইল নম্বর দিন (01XXXXXXXXX) • Enter a valid 11-digit BD mobile number.');
      return;
    }

    if (prefixMismatch) {
      setFormError(
        `এই নম্বরটি ${OPERATORS[detectedOp!].name} প্রিফিক্সের। নম্বরটি পোর্টেড (MNP) হলে নিচের MNP অপশনটি চালু করুন।`,
      );
      return;
    }

    if (!selectedOffer && (numericAmount < 10 || numericAmount > 10000)) {
      setFormError('ফ্লেক্সিলোড পরিমাণ ৳১০ থেকে ৳১০,০০০ এর মধ্যে হতে হবে।');
      return;
    }

    if (numericAmount > userBalance) {
      setFormError(
        `অপর্যাপ্ত ব্যালেন্স! আপনার বর্তমান ব্যালেন্স ${formatBdt(userBalance)}, কিন্তু প্রয়োজন ${formatBdt(numericAmount)}। আগে অ্যাড মানি করুন।`,
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
      setPinError('আপনার ৪ ডিজিটের গোপন পিন দিন • Enter your 4-digit security PIN.');
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
      receiptScale.setValue(0.85);
      setReceipt(result);
      Animated.spring(receiptScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }).start();
    } catch (error) {
      setPinError(error instanceof Error ? error.message : 'Transaction failed. Please check your PIN.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareReceipt = async () => {
    if (!receipt) return;
    const text = [
      '=== AllPay BD (অল পে বিডি) Receipt ===',
      `TrxID: ${receipt.trxId}`,
      `Operator: ${operator.name} (${operator.bnName})`,
      `Recipient: ${receipt.targetPhone}`,
      `Type: ${receipt.offerTitle || 'Flexiload Recharge'}`,
      `Amount: ${formatBdt(receipt.amount)}`,
      `New Balance: ${formatBdt(receipt.balanceAfter, true)}`,
      `Time: ${new Date(receipt.createdAt).toLocaleString()}`,
    ].join('\n');

    try {
      await Share.share({ message: text });
    } catch {
      // Fallback notification
    }
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  return (
    <Screen padded>
      <View style={styles.topBar}>
        <BackButton fallbackHref="/home" />
        <View style={styles.balanceChip}>
          <Text style={styles.balanceChipLabel}>ব্যালেন্স:</Text>
          <Text style={styles.balanceChipValue}>{formatBdt(userBalance, true)}</Text>
        </View>
      </View>

      {/* Operator Switcher Pills */}
      <View style={styles.opSwitchRow}>
        {OPERATOR_LIST.map((op) => {
          const isCurrent = op.code === activeOpCode;
          return (
            <Pressable
              key={op.code}
              onPress={() => {
                setSelectedOffer(null);
                setFormError(null);
                router.replace({ pathname: '/operator/[operatorCode]', params: { operatorCode: op.code } });
              }}
              style={[
                styles.opSwitchChip,
                isCurrent && { backgroundColor: op.softBg, borderColor: op.color },
              ]}
            >
              <Text style={[styles.opSwitchText, isCurrent && { color: op.color, fontWeight: '800' }]}>
                {op.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Operator Signature Header Card */}
      <View
        style={[
          styles.opHeroBanner,
          {
            backgroundColor: operator.softBg,
            borderColor: operator.color,
          },
        ]}
      >
        <View style={[styles.opHeroCircle, { backgroundColor: operator.color }]}>
          <Text style={styles.opHeroCircleText}>{operator.shortLabel}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.opHeroTitle}>
            {operator.name} • {operator.bnName}
          </Text>
          <Text style={styles.opHeroSub}>
            ফ্লেক্সিলোড ও ইন্টারনেট/মিনিট প্যাক • {operator.tagline}
          </Text>
        </View>
      </View>

      {formError ? (
        <NoticeCard
          tone="danger"
          title="অনুগ্রহ করে যাচাই করুন • Check Input"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      ) : null}

      {/* Top Section: 2-in-1 Flexiload & Selected Offer Input Card */}
      <Card style={{ ...styles.rechargeCard, borderColor: operator.color }}>
        <View style={styles.cardHeaderRow}>
          <Text style={type.h2}>
            {selectedOffer ? '📦 অফার ক্রয় • Offer Purchase' : '⚡ ফ্লেক্সিলোড • Instant Flexiload'}
          </Text>
          {selectedOffer ? (
            <Pressable
              onPress={() => {
                setSelectedOffer(null);
                setAmountInput('100');
              }}
              style={styles.clearOfferChip}
            >
              <Text style={styles.clearOfferText}>✕ ফ্লেক্সিলোডে ফিরুন</Text>
            </Pressable>
          ) : null}
        </View>

        {selectedOffer ? (
          <View style={[styles.selectedOfferBanner, { borderColor: operator.color, backgroundColor: operator.softBg }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.selectedOfferTitle, { color: operator.color }]}>
                {selectedOffer.title}
              </Text>
              <Text style={styles.selectedOfferMeta}>
                মেয়াদ: {selectedOffer.validity} • ক্যাটাগরি: {selectedOffer.category}
              </Text>
            </View>
            <Text style={styles.selectedOfferPrice}>{formatBdt(selectedOffer.price)}</Text>
          </View>
        ) : null}

        {/* Recipient Mobile Input */}
        <Text style={styles.inputLabel}>প্রাপকের মোবাইল নম্বর • Recipient Number (11 Digits)</Text>
        <View style={styles.phoneInputWrap}>
          <TextInput
            value={targetPhone}
            onChangeText={(v) => {
              setTargetPhone(v.replace(/\D/g, '').slice(0, 11));
              setFormError(null);
            }}
            placeholder={`${operator.prefixes[0]}XXXXXXXX`}
            placeholderTextColor={colors.textFaint}
            keyboardType="phone-pad"
            maxLength={11}
            style={styles.phoneInput}
          />
          {session.user?.phone ? (
            <Pressable
              onPress={() => {
                setTargetPhone(session.user?.phone ?? '');
                setMnpOverride(true);
              }}
              style={styles.myNumberBtn}
            >
              <Text style={styles.myNumberBtnText}>My Number</Text>
            </Pressable>
          ) : null}
        </View>

        {/* MNP Ported Number Toggle */}
        <Pressable
          onPress={() => setMnpOverride((prev) => !prev)}
          style={styles.mnpRow}
        >
          <View style={[styles.checkbox, mnpOverride && { backgroundColor: operator.color, borderColor: operator.color }]}>
            {mnpOverride ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.mnpText}>
            MNP পোর্টেড নম্বর (অন্য অপারেটর প্রিফিক্স থেকে {operator.bnName}-এ স্থানান্তরিত)
          </Text>
        </Pressable>

        {/* Quick Amount Chips & Custom Amount Input */}
        {!selectedOffer ? (
          <>
            <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>
              টাকার পরিমাণ • Amount (৳10 – ৳10,000)
            </Text>
            <View style={styles.quickChipsRow}>
              {QUICK_AMOUNTS.map((amt) => {
                const active = Number(amountInput) === amt;
                return (
                  <Pressable
                    key={amt}
                    onPress={() => setAmountInput(String(amt))}
                    style={[
                      styles.amountChip,
                      active && { backgroundColor: operator.color, borderColor: operator.color },
                    ]}
                  >
                    <Text style={[styles.amountChipText, active && { color: '#042F2E', fontWeight: '900' }]}>
                      ৳{amt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={amountInput}
              onChangeText={(v) => setAmountInput(v.replace(/\D/g, '').slice(0, 5))}
              placeholder="৳ পরিমাণ লিখুন (যেমন: 100)"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              style={styles.amountInput}
            />
          </>
        ) : null}

        <View style={{ height: spacing.md }} />
        <Button
          title={`রিচার্জ নিশ্চিত করুন • Proceed (${formatBdt(numericAmount)})`}
          onPress={handleProceedToPin}
          fullWidth
          style={{ backgroundColor: operator.color }}
        />
      </Card>

      {/* Bottom Section: Internet & Combo Offers */}
      <SectionHeader
        title={`${operator.bnName} স্পেশাল অফার • Bundles`}
        caption="যেকোনো অফারে ট্যাপ করলে স্বয়ংক্রিয়ভাবে দাম ও প্যাক সিলেক্ট হবে"
      />

      <FilterTabs
        tabs={[
          { key: 'ALL', label: 'All • সব', count: offers.length },
          { key: 'INTERNET', label: 'Internet • ইন্টারনেট' },
          { key: 'COMBO', label: 'Combo • কম্বো' },
          { key: 'MINUTES', label: 'Minutes • মিনিট' },
        ]}
        active={categoryFilter}
        onChange={(k) => setCategoryFilter(k as 'ALL' | OfferCategory)}
      />

      {loadingOffers ? (
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={operator.color} />
        </View>
      ) : (
        <View style={styles.offerList}>
          {filteredOffers.map((offer) => {
            const isSelected = selectedOffer?.id === offer.id;
            return (
              <Pressable
                key={offer.id}
                onPress={() => handleSelectOffer(offer)}
                style={({ pressed }) => [
                  styles.offerCard,
                  isSelected && { borderColor: operator.color, backgroundColor: operator.softBg },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.offerBadgeRow}>
                    <Pill
                      label={offer.category}
                      tone={offer.category === 'COMBO' ? 'info' : offer.category === 'INTERNET' ? 'success' : 'warning'}
                    />
                    <Text style={styles.offerValidity}>⏳ {offer.validity}</Text>
                  </View>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                </View>
                <View style={styles.offerRightCol}>
                  <Text style={[styles.offerPrice, { color: operator.color }]}>{formatBdt(offer.price)}</Text>
                  <View style={[styles.buyNowPill, { backgroundColor: isSelected ? operator.color : colors.surfaceElevated }]}>
                    <Text style={[styles.buyNowPillText, isSelected && { color: '#042F2E' }]}>
                      {isSelected ? '✓ Selected' : 'Select'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Part 4A: 4-Digit Security PIN Verification Modal */}
      <Modal
        visible={pinModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPinModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={type.h2}>🔐 ৪-ডিজিট গোপন পিন যাচাই করুন</Text>
              <Pressable onPress={() => setPinModalOpen(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>
            <Text style={[type.caption, { marginBottom: spacing.md }]}>
              Confirm your AllPay BD transaction with your 4-digit security PIN
            </Text>

            <View style={styles.summaryBox}>
              <SummaryRow label="অপারেটর (Operator)" value={`${operator.name} (${operator.bnName})`} />
              <SummaryRow label="প্রাপক নম্বর (Recipient)" value={targetPhone} />
              <SummaryRow
                label="সেবার ধরন (Type)"
                value={selectedOffer ? selectedOffer.title : 'Flexiload (ফ্লেক্সিলোড)'}
              />
              <SummaryRow label="মোট পরিমাণ (Total)" value={formatBdt(numericAmount)} tone="strong" />
              <SummaryRow
                label="পরবর্তী ব্যালেন্স (Remaining)"
                value={formatBdt(Math.max(0, userBalance - numericAmount), true)}
                tone="discount"
              />
            </View>

            {pinError ? (
              <NoticeCard tone="danger" title="PIN Verification Error" message={pinError} />
            ) : null}

            <View style={styles.pinLabelRow}>
              <Text style={styles.inputLabel}>৪-ডিজিট পিন দিন • Enter 4-Digit PIN</Text>
              <Pressable onPress={() => setPinInput('1234')} style={styles.demoPinChip}>
                <Text style={styles.demoPinChipText}>⚡ Demo PIN: 1234</Text>
              </Pressable>
            </View>

            <TextInput
              value={pinInput}
              onChangeText={(v) => setPinInput(v.replace(/\D/g, '').slice(0, 4))}
              placeholder="• • • •"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              style={styles.pinInputBox}
              autoFocus
            />

            <View style={styles.modalActions}>
              <Button
                title="বাতিল • Cancel"
                variant="secondary"
                onPress={() => setPinModalOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="নিশ্চিত করুন • Confirm"
                onPress={handleConfirmPinRecharge}
                loading={submitting}
                style={{ flex: 1, backgroundColor: operator.color }}
              />
            </View>
          </View>
        </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Part 4B: Animated Digital Receipt Modal */}
      <Modal
        visible={Boolean(receipt)}
        transparent
        animationType="fade"
        onRequestClose={() => setReceipt(null)}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.receiptDialog, { transform: [{ scale: receiptScale }] }]}>
            <View style={[styles.receiptCheckCircle, { backgroundColor: operator.color }]}>
              <Text style={styles.receiptCheckMark}>✓</Text>
            </View>
            <Text style={styles.receiptHeading}>রিচার্জ সফল হয়েছে! • Successful</Text>
            <Text style={styles.receiptSubheading}>
              AllPay BD (অল পে বিডি) ডিজিটাল লেনদেন রিসিট
            </Text>

            {receipt ? (
              <View style={styles.receiptTable}>
                <SummaryRow label="TrxID (ট্রানজেকশন আইডি)" value={receipt.trxId} tone="strong" />
                <SummaryRow label="অপারেটর (Operator)" value={`${operator.name} (${operator.bnName})`} />
                <SummaryRow label="প্রাপক (Recipient)" value={receipt.targetPhone} />
                <SummaryRow
                  label="বিবরণ (Package)"
                  value={receipt.offerTitle || 'Instant Flexiload'}
                />
                <SummaryRow label="পরিমাণ (Amount)" value={formatBdt(receipt.amount)} tone="strong" />
                <SummaryRow label="পূর্বের ব্যালেন্স (Before)" value={formatBdt(receipt.balanceBefore, true)} tone="muted" />
                <SummaryRow label="নতুন ব্যালেন্স (New Balance)" value={formatBdt(receipt.balanceAfter, true)} tone="discount" />
                <SummaryRow
                  label="সময় (Timestamp)"
                  value={new Date(receipt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  tone="muted"
                />
              </View>
            ) : null}

            {copiedNotice ? (
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm }}>
                ✓ রিসিট শেয়ার / কপি প্রস্তুত হয়েছে!
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <Button
                title="Share / Copy Receipt"
                variant="secondary"
                onPress={handleShareReceipt}
                style={{ flex: 1 }}
              />
              <Button
                title="হোমে ফিরুন • Home"
                onPress={() => {
                  setReceipt(null);
                  router.replace('/home');
                }}
                style={{ flex: 1, backgroundColor: operator.color }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  balanceChip: {
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
  balanceChipLabel: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  balanceChipValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  opSwitchRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  opSwitchChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  opSwitchText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textMuted,
  },
  opHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.md,
  },
  opHeroCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opHeroCircleText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#042F2E',
  },
  opHeroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  opHeroSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  rechargeCard: {
    borderWidth: 1.5,
    marginBottom: spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  clearOfferChip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearOfferText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  selectedOfferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  selectedOfferTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  selectedOfferMeta: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  selectedOfferPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  myNumberBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  myNumberBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.primary,
  },
  mnpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 11,
    fontWeight: '900',
    color: '#042F2E',
  },
  mnpText: {
    fontSize: 11.5,
    color: colors.textMuted,
    flex: 1,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  amountChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
  },
  amountChipText: {
    fontSize: 13.5,
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
  offerList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  offerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  offerValidity: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: '600',
  },
  offerTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.text,
  },
  offerRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  offerPrice: {
    fontSize: 17,
    fontWeight: '900',
  },
  buyNowPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  buyNowPillText: {
    fontSize: 11,
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
  modalSheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '800',
    padding: 4,
  },
  summaryBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  pinLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  demoPinChip: {
    backgroundColor: 'rgba(20, 184, 166, 0.16)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  demoPinChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  pinInputBox: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 12,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  receiptDialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: spacing.lg,
    alignItems: 'center',
  },
  receiptCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  receiptCheckMark: {
    fontSize: 32,
    fontWeight: '900',
    color: '#042F2E',
  },
  receiptHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  receiptSubheading: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  receiptTable: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
});

export default withSession(OperatorHubScreen);
