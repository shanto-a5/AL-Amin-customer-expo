import { router } from 'expo-router';
import * as React from 'react';
import {
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { vantaApi } from '@/api/vanta-api';
import { OfferRow, PageHeader } from '@/components/fintech-ui';
import {
  EmptyState,
  FilterTabs,
  LoadingSkeleton,
  Screen,
  SectionHeader,
} from '@/components/ui';
import type { OfferCategory, OfferDto } from '@/domain/types';
import { withSession, type ProtectedRoute } from '@/modules/session/route-guard';
import {
  baseFontFamily,
  colors,
  OPERATOR_LIST,
  spacing,
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

  const hasActiveFilter = operatorFilter !== 'ALL' || categoryFilter !== 'ALL';

  const resetFilters = React.useCallback(() => {
    setOperatorFilter('ALL');
    setCategoryFilter('ALL');
  }, []);

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
      <PageHeader
        eyebrow="Telecom bundles"
        title="Offers"
        subtitle="ইন্টারনেট, মিনিট ও কম্বো বান্ডেল বেছে নিন"
      />

      {/* Operator Filter Group */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterGroupLabel}>Operator</Text>
        <FilterTabs
          tabs={[
            { key: 'ALL', label: 'All operators' },
            ...OPERATOR_LIST.map((op) => ({
              key: op.code,
              label: op.name,
              accentColor: op.color,
            })),
          ]}
          active={operatorFilter}
          onChange={(k) => setOperatorFilter(k as 'ALL' | OperatorCode)}
        />
      </View>

      {/* Package Category Filter Group */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterGroupLabel}>Package category</Text>
        <FilterTabs
          tabs={[
            { key: 'ALL', label: 'All packs' },
            { key: 'COMBO', label: 'Combo · কম্বো' },
            { key: 'INTERNET', label: 'Internet · ইন্টারনেট' },
            { key: 'MINUTES', label: 'Minutes · মিনিট' },
          ]}
          active={categoryFilter}
          onChange={(k) => setCategoryFilter(k as 'ALL' | OfferCategory)}
        />
      </View>

      <View style={styles.resultsSection}>
        <SectionHeader
          title="Available bundles"
          caption={loading ? 'Loading packages...' : `${filtered.length} package${filtered.length === 1 ? '' : 's'} available`}
          actionLabel={hasActiveFilter ? 'Reset filters' : undefined}
          onAction={hasActiveFilter ? resetFilters : undefined}
        />

        {loading ? (
          <LoadingSkeleton rows={4} height={86} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No offers match these filters"
            message="Try selecting another operator or package category."
            actionLabel={hasActiveFilter ? 'Show all offers' : undefined}
            onAction={hasActiveFilter ? resetFilters : undefined}
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((offer) => (
              <OfferRow
                key={offer.id}
                offer={offer}
                actionLabel="Buy pack →"
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
  filterGroup: {
    marginBottom: 4,
  },
  filterGroupLabel: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 7,
  },
  resultsSection: {
    marginTop: spacing.sm,
  },
  list: {
    gap: 10,
  },
});

export default withSession(OffersExplorerScreen, '/offers' satisfies ProtectedRoute);
