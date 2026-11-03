import { Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

/**
 * AllPay BD (অল পে বিডি) Stark High-Contrast Fintech Design System Tokens
 * Strict Solid Black (#000000), Solid White (#FFFFFF), and Brand Orange Accent (#FF933E).
 */
export const colors = {
  background: '#000000',
  surface: '#000000',
  surfaceSecondary: '#000000',
  surfaceMuted: '#000000',
  surfaceElevated: '#000000',

  walletSurface: '#000000',
  walletBorder: 'rgba(255, 255, 255, 0.24)',
  walletDivider: 'rgba(255, 255, 255, 0.20)',

  border: 'rgba(255, 255, 255, 0.20)',
  borderStrong: 'rgba(255, 255, 255, 0.35)',
  divider: 'rgba(255, 255, 255, 0.20)',

  text: '#FFFFFF',
  textSecondary: '#D0D0D0',
  textMuted: '#A0A0A0',
  textFaint: '#7A7A7A',
  textInverse: '#000000',

  primary: '#FF933E',
  primaryDark: '#E07D2C',
  primarySoft: 'rgba(255, 147, 62, 0.15)',
  primaryBorder: '#FF933E',
  accent: '#FF933E',

  success: '#35C994',
  successSoft: 'rgba(53, 201, 148, 0.15)',
  warning: '#FF933E',
  warningSoft: 'rgba(255, 147, 62, 0.15)',
  danger: '#F06A7E',
  dangerSoft: 'rgba(240, 106, 126, 0.15)',

  notificationDot: '#FF933E',
  overlay: 'rgba(0, 0, 0, 0.88)',
} as const;

export const baseFontFamily = Platform.select({
  web: 'Inter, "Noto Sans Bengali", "Hind Siliguri", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: undefined,
});

export type OperatorCode = 'GP' | 'ROBI' | 'BL' | 'TELETALK';
export type GatewayCode = 'BKASH' | 'NAGAD' | 'BANK';

export const OPERATOR_LOGOS: Record<OperatorCode, any> = {
  GP: require('../../assets/images/operators/gp.png'),
  ROBI: require('../../assets/images/operators/robi.png'),
  BL: require('../../assets/images/operators/bl.png'),
  TELETALK: require('../../assets/images/operators/teletalk.png'),
};

export interface OperatorMeta {
  code: OperatorCode;
  name: string;
  bnName: string;
  shortLabel: string;
  symbolLabel: string;
  color: string;
  softBg: string;
  prefixes: string[];
  tagline: string;
  logo: any;
}

export const OPERATORS: Record<OperatorCode, OperatorMeta> = {
  GP: {
    code: 'GP',
    name: 'Grameenphone',
    bnName: 'গ্রামীণফোন',
    shortLabel: 'GP',
    symbolLabel: 'GP',
    color: '#00C8FF',
    softBg: 'rgba(0, 200, 255, 0.14)',
    prefixes: ['017', '013'],
    tagline: '017 · 013 network',
    logo: OPERATOR_LOGOS.GP,
  },
  ROBI: {
    code: 'ROBI',
    name: 'Robi',
    bnName: 'রবি',
    shortLabel: 'Robi',
    symbolLabel: 'ROBI',
    color: '#F1471D',
    softBg: 'rgba(241, 71, 29, 0.14)',
    prefixes: ['018', '016'],
    tagline: '018 · 016 network',
    logo: OPERATOR_LOGOS.ROBI,
  },
  BL: {
    code: 'BL',
    name: 'Banglalink',
    bnName: 'বাংলালিংক',
    shortLabel: 'BL',
    symbolLabel: 'BL',
    color: '#F36B16',
    softBg: 'rgba(243, 107, 22, 0.14)',
    prefixes: ['019', '014'],
    tagline: '019 · 014 network',
    logo: OPERATOR_LOGOS.BL,
  },
  TELETALK: {
    code: 'TELETALK',
    name: 'Teletalk',
    bnName: 'টেলিটক',
    shortLabel: 'Teletalk',
    symbolLabel: 'TT',
    color: '#6AC537',
    softBg: 'rgba(106, 197, 55, 0.14)',
    prefixes: ['015'],
    tagline: '015 network',
    logo: OPERATOR_LOGOS.TELETALK,
  },
};

export const OPERATOR_LIST: OperatorMeta[] = [
  OPERATORS.GP,
  OPERATORS.ROBI,
  OPERATORS.BL,
  OPERATORS.TELETALK,
];

export function detectOperatorFromPhone(phone: string): OperatorCode | null {
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 3) return null;
  const prefix = clean.slice(0, 3);
  for (const op of OPERATOR_LIST) {
    if (op.prefixes.includes(prefix)) return op.code;
  }
  return null;
}

export interface GatewayMeta {
  code: GatewayCode;
  name: string;
  bnName: string;
  shortLabel: string;
  color: string;
  softBg: string;
  placeholder: string;
  subtitle: string;
}

export const GATEWAYS: Record<GatewayCode, GatewayMeta> = {
  BKASH: {
    code: 'BKASH',
    name: 'bKash',
    bnName: 'বিকাশ',
    shortLabel: 'bK',
    color: '#FF6B9D',
    softBg: 'rgba(255, 107, 157, 0.13)',
    placeholder: '01XXXXXXXXX',
    subtitle: 'bKash mobile wallet transfer',
  },
  NAGAD: {
    code: 'NAGAD',
    name: 'Nagad',
    bnName: 'নগদ',
    shortLabel: 'NG',
    color: '#FFA04C',
    softBg: 'rgba(255, 160, 76, 0.13)',
    placeholder: '01XXXXXXXXX',
    subtitle: 'Nagad wallet cash-in',
  },
  BANK: {
    code: 'BANK',
    name: 'Bank',
    bnName: 'ব্যাংক',
    shortLabel: 'BK',
    color: '#73B5FF',
    softBg: 'rgba(115, 181, 255, 0.13)',
    placeholder: 'Account or card number',
    subtitle: 'NPSB · BEFTN · Card transfer',
  },
};

export const GATEWAY_LIST: GatewayMeta[] = [
  GATEWAYS.BKASH,
  GATEWAYS.NAGAD,
  GATEWAYS.BANK,
];

export function formatBdt(amount: number, showDecimals = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `৳${safe.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatBdtNumber(amount: number, showDecimals = true): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** 4px / 8px spacing scale */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Consistent corner radii scale */
export const radius = {
  xs: 8,
  sm: 11,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/** Readable English + Bengali typography hierarchy */
export const type = {
  eyebrow: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.primary,
  } as TextStyle,
  display: {
    fontFamily: baseFontFamily,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.9,
    color: colors.text,
  } as TextStyle,
  h1: {
    fontFamily: baseFontFamily,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
  } as TextStyle,
  h2: {
    fontFamily: baseFontFamily,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
  } as TextStyle,
  h3: {
    fontFamily: baseFontFamily,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: colors.text,
  } as TextStyle,
  body: {
    fontFamily: baseFontFamily,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
    color: colors.text,
  } as TextStyle,
  bodyMuted: {
    fontFamily: baseFontFamily,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '400',
    color: colors.textMuted,
  } as TextStyle,
  label: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.text,
  } as TextStyle,
  caption: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
    color: colors.textMuted,
  } as TextStyle,
  meta: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    color: colors.textFaint,
  } as TextStyle,
} as const;

export function makeShadow(elevation = 1): ViewStyle {
  if (elevation <= 0) {
    return {
      shadowColor: '#000000',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    };
  }
  return {
    shadowColor: '#000000',
    shadowOpacity: Math.min(0.26, 0.12 + elevation * 0.04),
    shadowRadius: 8 + elevation * 4,
    shadowOffset: { width: 0, height: 3 + elevation * 2 },
    elevation,
  };
}

export function row(
  justify: 'flex-start' | 'center' | 'space-between' | 'flex-end' = 'space-between',
): ViewStyle {
  return { flexDirection: 'row', alignItems: 'center', justifyContent: justify };
}

export const layout = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padded: { padding: spacing.xl },
});
