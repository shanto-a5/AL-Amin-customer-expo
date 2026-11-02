import type { NativeStackNavigationOptions } from 'expo-router';

import { colors } from '@/theme/tokens';

export const vantaStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};

export const vantaAuthStackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: '700', color: colors.text },
  contentStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};

export const ROUTE_GROUP_ANCHORS = {
  app: 'home',
  auth: 'login',
} as const;
