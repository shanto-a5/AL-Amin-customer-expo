/**
 * The single AllPay BD back affordance.
 *
 * Behaviour, in order:
 *  1. If there is real history, pop it.
 *  2. Otherwise, if the caller supplied a truthful `fallbackHref`, go there.
 *  3. Otherwise render nothing.
 */
import { router, type Href } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type Variant } from '@/components/ui';
import { goBackOrReplace, hasNavigationHistory } from '@/modules/navigation/back';
import { baseFontFamily, colors, radius } from '@/theme/tokens';

export interface BackButtonProps {
  fallbackHref?: Href;
  title?: string;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function BackButton({
  fallbackHref,
  title = 'Back',
  style,
  accessibilityLabel = 'Back',
}: BackButtonProps): React.JSX.Element | null {
  const insets = useSafeAreaInsets();

  if (!hasNavigationHistory() && !fallbackHref) return null;

  const goBack = (): void => {
    if (fallbackHref) goBackOrReplace(fallbackHref);
    else router.back();
  };

  return (
    <Pressable
      onPress={goBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        insets.left > 0 ? { marginLeft: -insets.left } : null,
        pressed && styles.pressed,
        style,
      ]}
    >
      <AppIcon name="back" size={16} color={colors.textMuted} />
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 38,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.78,
  },
  label: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
