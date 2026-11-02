import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { vantaApi } from '@/api/vanta-api';
import {
  EmptyState,
  FilterTabs,
  Pill,
  Screen,
  SectionHeader,
} from '@/components/ui';
import type { OfferCategory, OfferDto } from '@/domain/types';
import { withSession, type ProtectedRoute } from '@/modules/session/route-guard';
import {
  colors,
  formatBdt,
  OPERATORS,
  OPERATOR_LIST,
  radius,
  spacing,
  type,
  type OperatorCode,
} from '@/theme/tokens';

function OffersExplorerScreen(): React.JSX.Element {
  const [offers, setOffers] = React.useState<OfferDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [operatorFilter, setOperatorFilter] = React.useState<'ALL' | OperatorCode>('ALL');
  const [categoryFilter, setCategoryFilter] = React.useState<'ALL' | OfferCategory>('ALL');

  const loadOffers = React.useCallback(async () => {
    try {
      const res = await vantaApi.offers();
      setOffers(res.offers);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const filtered = React.useMemo(() => {
    return offers.filter((o) => {
      if (operatorFilter !== 'ALL' && o.operator !== operatorFilter) return false;
      if (categoryFilter !== 'ALL' && o.category !== categoryFilter) return false;
      return true;
    });
  }, [offers, operatorFilter, categoryFilter]);

  return (
    <Screen
      padded
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadOffers();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={type.h1}>স্পেশাল অফার • All Offers</Text>
      <Text style={[type.caption, { marginTop: 2, marginBottom: spacing.md }]}>
        গ্রামীণফোন, রবি, বাংলালিংক, এয়ারটেল ও টেলিটকের সেরা ইন্টারনেট ও কম্বো বান্ডেল
      </Text>

      {/* Operator Filter Pills */}
      <FilterTabs
        tabs={[
          { key: 'ALL', label: 'All Operators', count: offers.length },
          ...OPERATOR_LIST.map((op) => ({
            key: op.code,
            label: `${op.shortLabel} • ${op.bnName}`,
          })),
        ]}
        active={operatorFilter}
        onChange={(k) => setOperatorFilter(k as 'ALL' | OperatorCode)}
      />

      {/* Category Filter Tabs */}
      <FilterTabs
        tabs={[
          { key: 'ALL', label: 'সব • All' },
          { key: 'COMBO', label: 'কম্বো • Combo' },
          { key: 'INTERNET', label: 'ইন্টারনেট • Internet' },
          { key: 'MINUTES', label: 'মিনিট • Minutes' },
        ]}
        active={categoryFilter}
        onChange={(k) => setCategoryFilter(k as 'ALL' | OfferCategory)}
      />

      <SectionHeader
        title="উপলব্ধ প্যাকসমূহ • Available Bundles"
        caption="যেকোনো অফারে ট্যাপ করে সরাসরি রিচার্জ পেজে যান"
      />

      {loading ? (
        <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="কোনো অফার পাওয়া যায়নি"
          message="অন্য অপারেটর বা ক্যাটাগরি ফিল্টার নির্বাচন করে দেখুন।"
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((offer) => {
            const opMeta = OPERATORS[offer.operator] ?? OPERATORS.GP;
            return (
              <Pressable
                key={offer.id}
                onPress={() =>
                  router.push({
                    pathname: '/operator/[operatorCode]',
                    params: { operatorCode: offer.operator, offerId: offer.id },
                  })
                }
                style={({ pressed }) => [
                  styles.offerCard,
                  { borderColor: opMeta.color },
                  pressed && { opacity: 0.86 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.opPill, { backgroundColor: opMeta.softBg, borderColor: opMeta.color }]}>
                      <Text style={[styles.opPillText, { color: opMeta.color }]}>
                        {opMeta.shortLabel} • {opMeta.bnName}
                      </Text>
                    </View>
                    <Pill
                      label={offer.category}
                      tone={offer.category === 'COMBO' ? 'info' : offer.category === 'INTERNET' ? 'success' : 'warning'}
                    />
                    <Text style={styles.validity}>⏳ {offer.validity}</Text>
                  </View>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                </View>

                <View style={styles.rightCol}>
                  <Text style={[styles.price, { color: opMeta.color }]}>{formatBdt(offer.price)}</Text>
                  <View style={[styles.buyBtn, { backgroundColor: opMeta.color }]}>
                    <Text style={styles.buyBtnText}>কিনুন →</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
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
    padding: spacing.md,
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  opPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  opPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  validity: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: '600',
  },
  offerTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.text,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '900',
  },
  buyBtn: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  buyBtnText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#042F2E',
  },
});

export default withSession(OffersExplorerScreen, '/offers' satisfies ProtectedRoute);
