/**
 * AllPay BD theme compatibility tokens and layout helpers.
 */
import type { TextStyle, ViewStyle } from 'react-native';

import { baseFontFamily, colors, makeShadow as tokenShadow } from './tokens';

export const vanta = {
  colors: {
    primary: colors.primary,
    primaryDark: colors.primaryDark,
    primarySoft: colors.primarySoft,
    accent: colors.accent,
    bg: colors.background,
    surface: colors.surface,
    border: colors.border,
    text: colors.text,
    textMuted: colors.textMuted,
    textInverse: colors.textInverse,
    overlay: colors.overlay,
    danger: colors.danger,
    dangerSoft: colors.dangerSoft,
    success: colors.success,
    successSoft: colors.successSoft,
    infoSoft: colors.primarySoft,
  },
  typography: {
    title: { fontFamily: baseFontFamily, fontSize: 25, fontWeight: '700', color: colors.text } as TextStyle,
    h1: { fontFamily: baseFontFamily, fontSize: 22, fontWeight: '700', color: colors.text } as TextStyle,
    h2: { fontFamily: baseFontFamily, fontSize: 17, fontWeight: '700', color: colors.text } as TextStyle,
    body: { fontFamily: baseFontFamily, fontSize: 14, fontWeight: '400', color: colors.text } as TextStyle,
    label: { fontFamily: baseFontFamily, fontSize: 13, fontWeight: '600', color: colors.text } as TextStyle,
    caption: { fontFamily: baseFontFamily, fontSize: 12, fontWeight: '400', color: colors.textMuted } as TextStyle,
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24 },
  radius: { sm: 11, md: 14, lg: 18, xl: 24, pill: 999 },
};

export interface Shadow {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
}

export function makeShadow(elevation = 1): Shadow {
  const s = tokenShadow(elevation);
  return {
    shadowColor: String(s.shadowColor ?? '#000000'),
    shadowOpacity: Number(s.shadowOpacity ?? 0.16),
    shadowRadius: Number(s.shadowRadius ?? 12),
    shadowOffset: (s.shadowOffset as { width: number; height: number }) ?? { width: 0, height: 4 },
    elevation,
  };
}

export function card(): ViewStyle {
  return {
    backgroundColor: colors.surface,
    borderRadius: vanta.radius.lg,
    padding: vanta.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  };
}

export const iconForeground = (token: string): { name: string; color: string } => {
  switch (token) {
    case 'user':
      return { name: 'person', color: colors.primary };
    case 'admin':
      return { name: 'shield', color: colors.primary };
    default:
      return { name: 'circle', color: colors.textMuted };
  }
};
