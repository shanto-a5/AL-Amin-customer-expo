/**
 * AllPay BD theme tokens and layout helpers.
 */
import type { TextStyle, ViewStyle } from 'react-native';

export const vanta = {
  colors: {
    primary: '#14B8A6',
    primaryDark: '#0D9488',
    primarySoft: '#0F292A',
    accent: '#06B6D4',
    bg: '#000000',
    surface: '#0F172A',
    border: '#334155',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    textInverse: '#042F2E',
    overlay: 'rgba(2, 6, 23, 0.84)',
    danger: '#EF4444',
    dangerSoft: '#2A1215',
    success: '#10B981',
    successSoft: '#062E22',
    infoSoft: '#0F292A',
  },
  typography: {
    title: { fontSize: 28, fontWeight: '800', color: '#F8FAFC' } as TextStyle,
    h1: { fontSize: 22, fontWeight: '700', color: '#F8FAFC' } as TextStyle,
    h2: { fontSize: 17, fontWeight: '700', color: '#F8FAFC' } as TextStyle,
    body: { fontSize: 14, fontWeight: '400', color: '#F8FAFC' } as TextStyle,
    label: { fontSize: 13, fontWeight: '600', color: '#F8FAFC' } as TextStyle,
    caption: { fontSize: 12, fontWeight: '400', color: '#94A3B8' } as TextStyle,
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 },
  radius: { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 },
};

export interface Shadow {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
}

export function makeShadow(elevation = 2): Shadow {
  return {
    shadowColor: '#000000',
    shadowOpacity: 0.4 + elevation * 0.05,
    shadowRadius: 4 + elevation * 1.5,
    shadowOffset: { width: 0, height: 1 + elevation },
    elevation,
  };
}

export function card(): ViewStyle {
  return {
    backgroundColor: vanta.colors.surface,
    borderRadius: vanta.radius.lg,
    padding: vanta.spacing.lg,
    borderWidth: 1,
    borderColor: vanta.colors.border,
    ...makeShadow(1),
  };
}

export const iconForeground = (token: string): { name: string; color: string } => {
  switch (token) {
    case 'user':
      return { name: 'person', color: '#14B8A6' };
    case 'admin':
      return { name: 'shield', color: '#06B6D4' };
    default:
      return { name: 'circle', color: vanta.colors.textMuted };
  }
};
