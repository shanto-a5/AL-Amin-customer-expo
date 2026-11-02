/**
 * AllPay BD (অল পে বিডি) Bottom Navigation Bar — 4 Persistent Tabs:
 * 1. Home (হোম)
 * 2. Offers (অফার)
 * 3. History (হিস্ট্রি)
 * 4. Profile (প্রোফাইল)
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import mediumWeight from 'expo-symbols/androidWeights/medium';
import * as React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, makeShadow, radius, spacing } from '@/theme/tokens';
import { CUSTOMER_DOCK_BOTTOM_GAP, CUSTOMER_DOCK_HEIGHT } from './customer-dock-inset';

const DOCK_MAX_WIDTH = 430;
const ICON_SIZE = 20;
const MIN_TOUCH_TARGET = 44;

const ICON_WEIGHT = { ios: 'medium' as const, android: mediumWeight };

type DockHref = '/home' | '/offers' | '/transactions' | '/settings';

type DockTab = {
  key: 'home' | 'offers' | 'transactions' | 'settings';
  label: string;
  bnLabel: string;
  href: DockHref;
  match: (pathname: string) => boolean;
  icon: {
    ios: 'house.fill' | 'sparkles' | 'clock.fill' | 'person.fill';
    android: 'home' | 'local_offer' | 'history' | 'person';
    web: 'home' | 'local_offer' | 'history' | 'person';
  };
};

const TABS: readonly DockTab[] = [
  {
    key: 'home',
    label: 'Home',
    bnLabel: 'হোম',
    href: '/home',
    match: (p) => p === '/home' || p.startsWith('/operator') || p === '/add-money',
    icon: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  {
    key: 'offers',
    label: 'Offers',
    bnLabel: 'অফার',
    href: '/offers',
    match: (p) => p === '/offers',
    icon: { ios: 'sparkles', android: 'local_offer', web: 'local_offer' },
  },
  {
    key: 'transactions',
    label: 'History',
    bnLabel: 'হিস্ট্রি',
    href: '/transactions',
    match: (p) => p === '/transactions',
    icon: { ios: 'clock.fill', android: 'history', web: 'history' },
  },
  {
    key: 'settings',
    label: 'Profile',
    bnLabel: 'প্রোফাইল',
    href: '/settings',
    match: (p) => p === '/settings' || p === '/notifications',
    icon: { ios: 'person.fill', android: 'person', web: 'person' },
  },
];

type BlurStyle = ViewStyle & { backdropFilter?: string; WebkitBackdropFilter?: string };

const NATIVE_GLASS_AVAILABLE = isLiquidGlassAvailable();

const WEB_BACKDROP_BLUR: BlurStyle | null =
  Platform.OS === 'web'
    ? {
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }
    : null;

export function SellerBottomDock(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const items = (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (pathname !== tab.href) router.navigate(tab.href);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${tab.label} (${tab.bnLabel})`}
            accessibilityState={{ selected: active }}
            aria-selected={active}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          >
            <View style={[styles.itemInner, active && styles.itemInnerActive]}>
              <View style={styles.iconSlot}>
                <SymbolView
                  name={tab.icon}
                  size={ICON_SIZE}
                  weight={ICON_WEIGHT}
                  tintColor={active ? colors.primary : colors.textMuted}
                />
              </View>
              <Text numberOfLines={1} style={[styles.label, active ? styles.labelActive : styles.labelIdle]}>
                {tab.label} • {tab.bnLabel}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const surfaceStyle = [
    styles.surface,
    NATIVE_GLASS_AVAILABLE ? null : styles.surfaceFallback,
    WEB_BACKDROP_BLUR,
    makeShadow(3),
  ];

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom: insets.bottom + CUSTOMER_DOCK_BOTTOM_GAP }]}>
      {NATIVE_GLASS_AVAILABLE ? (
        <GlassView glassEffectStyle="regular" isInteractive tintColor="rgba(15, 23, 42, 0.88)" style={surfaceStyle}>
          {items}
        </GlassView>
      ) : (
        <View style={surfaceStyle}>{items}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  surface: {
    maxWidth: DOCK_MAX_WIDTH,
    width: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  surfaceFallback: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CUSTOMER_DOCK_HEIGHT,
    paddingHorizontal: spacing.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.pill,
  },
  itemPressed: { opacity: 0.7 },
  itemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  itemInnerActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.16)',
  },
  iconSlot: { width: ICON_SIZE, height: ICON_SIZE, alignItems: 'center', justifyContent: 'center' },
  label: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  labelActive: { color: colors.primary },
  labelIdle: { color: colors.textMuted },
});
