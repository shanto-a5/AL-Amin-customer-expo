import { router } from 'expo-router';
import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { vantaApi } from '@/api/vanta-api';
import { AvatarImage, Button, Card, Logo, Pill, Screen, SectionHeader } from '@/components/ui';
import { useFocusRefresh } from '@/modules/navigation/focus-refresh';
import { withSession, type ProtectedRoute } from '@/modules/session/route-guard';
import type { SessionContextValue } from '@/modules/session/session-context';
import { notificationService } from '@/services/notification-service';
import {
  colors,
  formatBdt,
  OPERATOR_LIST,
  radius,
  spacing,
  type,
  type OperatorCode,
} from '@/theme/tokens';

function formatCountdown(targetIso: string | null, nowMs: number): string {
  if (!targetIso) return '00:00';
  const diffSec = Math.max(0, Math.ceil((new Date(targetIso).getTime() - nowMs) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function CustomerHomeScreen({ session }: { session: SessionContextValue }): React.JSX.Element {
  useFocusRefresh();
  const user = session.user;
  const unread = user ? notificationService.unreadCount(user.id) : 0;

  // Tap-to-Reveal Balance state: strictly masked by default on mount
  const [balanceRevealed, setBalanceRevealed] = React.useState(false);
  const revealTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live clock for 10-minute Add Money countdown
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [completingTrxId, setCompletingTrxId] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const toggleBalanceReveal = React.useCallback(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setBalanceRevealed((prev) => {
      const next = !prev;
      if (next) {
        revealTimerRef.current = setTimeout(() => {
          setBalanceRevealed(false);
          revealTimerRef.current = null;
        }, 6000);
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  const pendingAddMoney = user?.pendingAddMoney ?? [];

  // Tick every second when there is an active PROCESSING Add Money transaction
  React.useEffect(() => {
    if (pendingAddMoney.length === 0) return;
    const interval = setInterval(() => {
      const currentNow = Date.now();
      setNowMs(currentNow);
      const anyMatured = pendingAddMoney.some(
        (trx) => trx.scheduledReleaseAt && new Date(trx.scheduledReleaseAt).getTime() <= currentNow,
      );
      if (anyMatured) {
        void session.refresh();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingAddMoney, session]);

  const handleInstantComplete = React.useCallback(
    async (trxId: string) => {
      setCompletingTrxId(trxId);
      try {
        await vantaApi.completeAddMoneyNow(trxId);
        await session.refresh();
        setBalanceRevealed(true);
      } finally {
        setCompletingTrxId(null);
      }
    },
    [session],
  );

  const onPullRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await session.refresh();
    } finally {
      setRefreshing(false);
    }
  }, [session]);

  const navigateToOperator = (code: OperatorCode) => {
    router.push({ pathname: '/operator/[operatorCode]', params: { operatorCode: code } });
  };

  return (
    <Screen
      padded
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.primary} />
      }
    >
      {/* Top Brand Bar */}
      <View style={styles.topBrandRow}>
        <Logo size={42} />
        <Pressable
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
          style={styles.notifBadgeBtn}
        >
          <Text style={styles.notifIcon}>🔔</Text>
          {unread > 0 ? (
            <View style={styles.unreadDot}>
              <Text style={styles.unreadDotText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Top Profile & Tap-to-Reveal Balance Card */}
      <Card style={styles.profileHeroCard}>
        <View style={styles.profileTopRow}>
          <Pressable
            onPress={() => router.push('/settings')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}
          >
            <AvatarImage
              uri={user?.avatarUrl || user?.avatar || `p:👤:${user?.phone ?? 'user'}`}
              size={52}
              cornerRadius={radius.pill}
            />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.userName}>
                {user?.name ?? 'AllPay Customer'}
              </Text>
              <Text style={styles.userPhone}>{user?.phone ?? ''}</Text>
              <View style={styles.idBadgeRow}>
                <View style={styles.customerIdPill}>
                  <Text style={styles.customerIdText}>ID: {user?.customerId || 'AP-100001'}</Text>
                </View>
                {session.isAdmin ? <Pill label="ADMIN" tone="info" /> : null}
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.balanceDivider} />

        {/* Interactive Tap-to-Reveal Balance Toggle */}
        <View style={styles.balanceRow}>
          <View>
            <Text style={styles.balanceCaption}>মূল অ্যাকাউন্ট ব্যালেন্স • Wallet Balance</Text>
            <Pressable
              onPress={toggleBalanceReveal}
              accessibilityRole="button"
              accessibilityLabel={balanceRevealed ? 'Hide wallet balance' : 'Tap to reveal wallet balance'}
              style={({ pressed }) => [
                styles.balancePillButton,
                balanceRevealed && styles.balancePillButtonRevealed,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.balanceDot} />
              <Text style={styles.balancePillText}>
                {balanceRevealed ? formatBdt(user?.balance ?? 0, true) : '•••• Tap for Balance'}
              </Text>
              <Text style={styles.balanceTapHint}>{balanceRevealed ? '🙈' : '👁️'}</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push('/add-money')}
            accessibilityRole="button"
            accessibilityLabel="Add Money to Wallet"
            style={({ pressed }) => [styles.addMoneyCtaBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.addMoneyCtaPlus}>＋</Text>
            <View>
              <Text style={styles.addMoneyCtaLabel}>অ্যাড মানি</Text>
              <Text style={styles.addMoneyCtaSub}>Add Money</Text>
            </View>
          </Pressable>
        </View>
      </Card>

      {/* Active 10-Minute Hold Add Money Banner(s) */}
      {pendingAddMoney.map((trx) => {
        const countdown = formatCountdown(trx.scheduledReleaseAt, nowMs);
        return (
          <View key={trx.trxId} style={styles.pendingBanner}>
            <View style={styles.pendingBannerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingBannerTitle}>
                  ⏳ অ্যাড মানি প্রসেসিং হচ্ছে ({trx.paymentGateway} • {formatBdt(trx.amount)})
                </Text>
                <Text style={styles.pendingBannerBody}>
                  Wait please 10 minutes! আপনার অ্যাড মানি প্রসেসিং হচ্ছে। ১০ মিনিটের মধ্যে মূল অ্যাকাউন্টে ব্যালেন্স যোগ হয়ে যাবে।
                </Text>
              </View>
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownLabel}>মুক্তি পাবে</Text>
                <Text style={styles.countdownValue}>{countdown}</Text>
              </View>
            </View>
            <View style={styles.pendingBannerFooter}>
              <Text style={styles.pendingTrxId}>TrxID: {trx.trxId}</Text>
              <Pressable
                onPress={() => handleInstantComplete(trx.trxId)}
                disabled={completingTrxId === trx.trxId}
                style={({ pressed }) => [styles.instantCompleteBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.instantCompleteBtnText}>
                  {completingTrxId === trx.trxId
                    ? 'Completing...'
                    : '⚡ Simulate Instant Complete'}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {/* Quick Action Banner — Add Money */}
      <Pressable
        onPress={() => router.push('/add-money')}
        accessibilityRole="button"
        accessibilityLabel="Add Money via bKash, Nagad, or Bank"
        style={({ pressed }) => [styles.quickAddMoneyBanner, pressed && { opacity: 0.9 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.quickBannerTitle}>+ অ্যাড মানি • Add Money to Wallet</Text>
          <Text style={styles.quickBannerSubtitle}>
            বিকাশ (bKash), নগদ (Nagad) অথবা ব্যাংক অ্যাকাউন্ট থেকে তাৎক্ষণিক ব্যালেন্স রিচার্জ
          </Text>
        </View>
        <View style={styles.quickBannerArrow}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textInverse }}>→</Text>
        </View>
      </Pressable>

      {/* Telecom Operator Grid (5 Signature Cards) */}
      <SectionHeader
        title="টেলিকম অপারেটর • Flexiload & Bundles"
        caption="যেকোনো অপারেটর কার্ডে ট্যাপ করে রিচার্জ বা অফার কিনুন"
        actionLabel="সব অফার দেখুন"
        onAction={() => router.push('/offers')}
      />

      <View style={styles.operatorGrid}>
        {OPERATOR_LIST.map((op) => (
          <Pressable
            key={op.code}
            onPress={() => navigateToOperator(op.code)}
            accessibilityRole="button"
            accessibilityLabel={`${op.name} (${op.bnName}) Flexiload and Offers`}
            style={({ pressed }) => [
              styles.operatorCard,
              {
                borderColor: op.color,
                backgroundColor: colors.surface,
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.operatorCardTop}>
              <View style={[styles.operatorBadge, { backgroundColor: op.softBg, borderColor: op.color }]}>
                <Text style={[styles.operatorBadgeText, { color: op.color }]}>{op.shortLabel}</Text>
              </View>
              <View style={[styles.operatorArrowDot, { backgroundColor: op.softBg }]}>
                <Text style={{ color: op.color, fontSize: 13, fontWeight: '800' }}>↗</Text>
              </View>
            </View>
            <Text style={styles.operatorName}>{op.name}</Text>
            <Text style={[styles.operatorBnName, { color: op.color }]}>{op.bnName}</Text>
            <Text style={styles.operatorPrefix}>{op.tagline}</Text>
          </Pressable>
        ))}
      </View>

      {/* Secondary Quick Shortcuts */}
      <SectionHeader title="দ্রুত সেবা • Quick Services" caption="Explore offers & transaction ledger" />
      <View style={styles.shortcutRow}>
        <Card style={{ flex: 1, padding: spacing.md }}>
          <Text style={styles.shortcutEmoji}>🔥</Text>
          <Text style={type.h3}>স্পেশাল অফার</Text>
          <Text style={[type.caption, { marginTop: 2, marginBottom: spacing.sm }]}>
            ৩০ জিবি ও কম্বো প্যাক
          </Text>
          <Button
            title="Offers"
            variant="secondary"
            fullWidth
            onPress={() => router.push('/offers')}
          />
        </Card>
        <Card style={{ flex: 1, padding: spacing.md }}>
          <Text style={styles.shortcutEmoji}>🧾</Text>
          <Text style={type.h3}>লেনদেন বিবরণী</Text>
          <Text style={[type.caption, { marginTop: 2, marginBottom: spacing.sm }]}>
            সকল ডিজিটাল রিসিট
          </Text>
          <Button
            title="History"
            variant="secondary"
            fullWidth
            onPress={() => router.push('/transactions')}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  notifBadgeBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIcon: {
    fontSize: 18,
  },
  unreadDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadDotText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  profileHeroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  userPhone: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  idBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 6,
  },
  customerIdPill: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.45)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  customerIdText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  balanceCaption: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginBottom: 6,
  },
  balancePillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    minWidth: 185,
  },
  balancePillButtonRevealed: {
    backgroundColor: 'rgba(20, 184, 166, 0.16)',
  },
  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  balancePillText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  balanceTapHint: {
    fontSize: 14,
  },
  addMoneyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  addMoneyCtaPlus: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textInverse,
  },
  addMoneyCtaLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textInverse,
  },
  addMoneyCtaSub: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textInverse,
    opacity: 0.85,
  },
  pendingBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pendingBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  pendingBannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FBBF24',
    marginBottom: 4,
  },
  pendingBannerBody: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
  },
  countdownBadge: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 68,
  },
  countdownLabel: {
    fontSize: 9.5,
    color: '#FBBF24',
    fontWeight: '700',
  },
  countdownValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  pendingBannerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.25)',
  },
  pendingTrxId: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
  },
  instantCompleteBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  instantCompleteBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.textInverse,
  },
  quickAddMoneyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(6, 182, 212, 0.14)',
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  quickBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  quickBannerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 17,
  },
  quickBannerArrow: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  operatorCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.md,
    minHeight: 118,
    justifyContent: 'space-between',
  },
  operatorCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  operatorBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  operatorBadgeText: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  operatorArrowDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operatorName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  operatorBnName: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  operatorPrefix: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  shortcutEmoji: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
});

export default withSession(CustomerHomeScreen, '/home' satisfies ProtectedRoute);
