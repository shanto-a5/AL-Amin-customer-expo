/**
 * AllPay BD Integrated Bottom Navigation Bar
 * Four destinations: Home, Offers, History, Profile.
 */
import { router, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import mediumWeight from 'expo-symbols/androidWeights/medium';
import * as React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { baseFontFamily, colors } from '@/theme/tokens';

const ICON_SIZE = 19;
const MIN_TOUCH_TARGET = 46;
const IDLE_COLOR = '#A0A0A0';

const ICON_WEIGHT = { ios: 'medium' as const, android: mediumWeight };

type DockHref = '/home' | '/offers' | '/transactions' | '/settings';

type DockTab = {
  key: 'home' | 'offers' | 'transactions' | 'settings';
  label: string;
  accessibilityName: string;
  href: DockHref;
  match: (pathname: string) => boolean;
  icon: {
    ios: 'house' | 'sparkles' | 'clock' | 'person';
    android: 'home' | 'auto_awesome' | 'schedule' | 'person';
    web: 'home' | 'auto_awesome' | 'schedule' | 'person';
  };
};

const TABS: readonly DockTab[] = [
  {
    key: 'home',
    label: 'Home',
    accessibilityName: 'Home',
    href: '/home',
    match: (p) => p === '/home' || p.startsWith('/operator') || p === '/add-money',
    icon: { ios: 'house', android: 'home', web: 'home' },
  },
  {
    key: 'offers',
    label: 'Offers',
    accessibilityName: 'Offers',
    href: '/offers',
    match: (p) => p === '/offers',
    icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  },
  {
    key: 'transactions',
    label: 'History',
    accessibilityName: 'Transaction history',
    href: '/transactions',
    match: (p) => p === '/transactions',
    icon: { ios: 'clock', android: 'schedule', web: 'schedule' },
  },
  {
    key: 'settings',
    label: 'Profile',
    accessibilityName: 'Profile and settings',
    href: '/settings',
    match: (p) => p === '/settings' || p === '/notifications',
    icon: { ios: 'person', android: 'person', web: 'person' },
  },
];

type BlurStyle = ViewStyle & { backdropFilter?: string; WebkitBackdropFilter?: string };

const WEB_BACKDROP_BLUR: BlurStyle | null =
  Platform.OS === 'web'
    ? {
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }
    : null;

export function BottomNavigation(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const bottomPad = Math.max(10, insets.bottom);

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        WEB_BACKDROP_BLUR,
        { paddingBottom: bottomPad },
      ]}
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const tint = active ? colors.primary : IDLE_COLOR;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (pathname !== tab.href) router.navigate(tab.href);
            }}
            accessibilityRole="tab"
            accessibilityLabel={tab.accessibilityName}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.item,
              active && styles.itemActive,
              pressed && styles.itemPressed,
            ]}
          >
            <View style={styles.iconSlot}>
              <SymbolView
                name={tab.icon}
                size={ICON_SIZE}
                weight={ICON_WEIGHT}
                tintColor={tint}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.label, active ? styles.labelActive : styles.labelIdle]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Backwards-compatible alias for layout shells. */
export const SellerBottomDock = BottomNavigation;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  itemActive: {
    backgroundColor: 'rgba(255, 147, 62, 0.12)',
  },
  itemPressed: {
    opacity: 0.78,
  },
  iconSlot: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: baseFontFamily,
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  labelIdle: {
    color: IDLE_COLOR,
  },
});
