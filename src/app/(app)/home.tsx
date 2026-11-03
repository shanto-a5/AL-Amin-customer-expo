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
import {
  AppHeader,
  OfferRow,
  OperatorTile,
  WalletBalanceCard,
} from '@/components/fintech-ui';
import {
  LoadingSkeleton,
  Screen,
  SectionHeader,
  StatusIndicator,
} from '@/components/ui';
import type { OfferDto } from '@/domain/types';
import { useFocusRefresh } from '@/modules/navigation/focus-refresh';
import { withSession, type ProtectedRoute } from '@/modules/session/route-guard';
import type { SessionContextValue } from '@/modules/session/session-context';
import { notificationService } from '@/services/notification-service';
import {
  baseFontFamily,
  colors,
  formatBdt,
  OPERATOR_LIST,
  radius,
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

function selectPopularOffers(all: OfferDto[]): OfferDto[] {
  if (all.length <= 3) return all;
  const picked: OfferDto[] = [];
  const seenOperators = new Set<string>();

  for (const offer of all) {
    if (!seenOperators.has(offer.operator)) {
      picked.push(offer);
      seenOperators.add(offer.operator);
      if (picked.length === 3) return picked;
    }
  }
  for (const offer of all) {
    if (!picked.some((p) => p.id === offer.id)) {
      picked.push(offer);
      if (picked.length === 3) break;
    }
  }
  return picked;
}

function CustomerHomeScreen({ session }: { session: SessionContextValue }): React.JSX.Element {
  useFocusRefresh();
  const user = session.user;
  const unread = user ? notificationService.unreadCount(user.id) : 0;

  const [balanceVisible, setBalanceVisible] = React.useState(true);
  const [popularOffers, setPopularOffers] = React.useState<OfferDto[]>([]);
  const [loadingOffers, setLoadingOffers] = React.useState(true);

  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [completingTrxId, setCompletingTrxId] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadOffers = React.useCallback(async () => {
    try {
      const res = await vantaApi.offers();
      setPopularOffers(selectPopularOffers(res.offers));
    } catch {
      // Keep existing offers if offline
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    vantaApi
      .offers()
      .then((res) => {
        if (mounted) setPopularOffers(selectPopularOffers(res.offers));
      })
      .catch(() => {
        // Keep existing offers if offline
      })
      .finally(() => {
        if (mounted) setLoadingOffers(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const pendingAddMoney = React.useMemo(
    () => user?.pendingAddMoney ?? [],
    [user?.pendingAddMoney],
  );

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
      } finally {
        setCompletingTrxId(null);
      }
    },
    [session],
  );

  const onPullRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([session.refresh(), loadOffers()]);
    } finally {
      setRefreshing(false);
    }
  }, [session, loadOffers]);

  const navigateToOperator = (code: OperatorCode) => {
    router.push({ pathname: '/operator/[operatorCode]', params: { operatorCode: code } });
  };

  const pairedOperators = [
    [OPERATOR_LIST[0], OPERATOR_LIST[1]],
    [OPERATOR_LIST[2], OPERATOR_LIST[3]],
  ] as const;

  return (
    <Screen
      padded
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onPullRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Compact Brand Header */}
      <AppHeader
        unreadCount={unread}
        onPressNotifications={() => router.push('/notifications')}
      />

      {/* Welcome Area */}
      <View style={styles.welcome}>
        <Text style={type.eyebrow}>Your everyday mobile wallet</Text>
        <Text style={styles.welcomeTitle}>Welcome back</Text>
        <Text style={styles.welcomeSubtitle}>
          Manage your wallet and recharge in a few taps.
        </Text>
      </View>

      {/* Wallet Balance Card */}
      <WalletBalanceCard
        balance={user?.balance ?? 0}
        visible={balanceVisible}
        onToggleVisibility={() => setBalanceVisible((prev) => !prev)}
        customerId={user?.customerId || 'AP-100001'}
        onAddMoney={() => router.push('/add-money')}
      />

      {/* Active Processing Add Money Hold(s) */}
      {pendingAddMoney.map((trx) => {
        const countdown = formatCountdown(trx.scheduledReleaseAt, nowMs);
        return (
          <View key={trx.trxId} style={styles.pendingCard}>
            <View style={styles.pendingTopRow}>
              <StatusIndicator status="PROCESSING" label="Add Money processing" />
              <View style={styles.countdownPill}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            </View>
            <Text style={styles.pendingBody}>
              {trx.paymentGateway} · {formatBdt(trx.amount)} will be credited to your wallet within 10 minutes (অ্যাড মানি প্রসেসিং হচ্ছে).
            </Text>
            <View style={styles.pendingFooter}>
              <Text style={styles.pendingRef}>Ref: {trx.trxId}</Text>
              <Pressable
                onPress={() => handleInstantComplete(trx.trxId)}
                disabled={completingTrxId === trx.trxId}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Simulate instant settlement"
                style={({ pressed }) => [styles.settleAction, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.settleActionText}>
                  {completingTrxId === trx.trxId ? 'Completing...' : 'Complete now →'}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {/* Operator Selection */}
      <View style={styles.section}>
        <SectionHeader
          title="Choose your operator"
          caption="অপারেটর নির্বাচন করে রিচার্জ বা অফার দেখুন"
          actionLabel="View all"
          onAction={() => router.push('/offers')}
        />

        <View style={styles.operatorGrid}>
          {pairedOperators.map(([leftOp, rightOp], idx) => (
            <View key={idx} style={styles.operatorPairRow}>
              <OperatorTile
                operator={leftOp}
                onPress={() => navigateToOperator(leftOp.code)}
                style={styles.operatorHalf}
              />
              <OperatorTile
                operator={rightOp}
                onPress={() => navigateToOperator(rightOp.code)}
                style={styles.operatorHalf}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Popular Offers */}
      <View style={styles.section}>
        <SectionHeader
          title="Popular offers"
          caption="Hand-picked bundles from your operators"
          actionLabel="See all offers"
          onAction={() => router.push('/offers')}
        />

        {loadingOffers ? (
          <LoadingSkeleton rows={2} height={86} />
        ) : (
          <View style={styles.offersList}>
            {popularOffers.map((offer) => (
              <OfferRow
                key={offer.id}
                offer={offer}
                actionLabel="View offer →"
                onPress={() =>
                  router.push({
                    pathname: '/operator/[operatorCode]',
                    params: { operatorCode: offer.operator, offerId: offer.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcome: {
    marginBottom: 18,
  },
  welcomeTitle: {
    fontFamily: baseFontFamily,
    marginTop: 6,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: colors.text,
  },
  welcomeSubtitle: {
    fontFamily: baseFontFamily,
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },

  pendingCard: {
    marginTop: 12,
    padding: 15,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 84, 0.28)',
    gap: 8,
  },
  pendingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  countdownPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.xs,
    backgroundColor: colors.warningSoft,
  },
  countdownText: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
  },
  pendingBody: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
  },
  pendingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  pendingRef: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    color: colors.textFaint,
  },
  settleAction: {
    paddingVertical: 2,
  },
  settleActionText: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  section: {
    marginTop: 28,
  },
  operatorGrid: {
    gap: 10,
  },
  operatorPairRow: {
    flexDirection: 'row',
    gap: 10,
  },
  operatorHalf: {
    flex: 1,
  },
  offersList: {
    gap: 10,
  },
});

export default withSession(CustomerHomeScreen, '/home' satisfies ProtectedRoute);
