import { Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

/**
 * AllPay BD (অল পে বিডি) Fintech Design System Tokens
 * Grounded in the minimalist dark slate & teal visual benchmark.
 */
export const colors = {
  background: '#0B1120',
  surface: '#111B2D',
  surfaceSecondary: '#172338',
  surfaceMuted: '#172338',
  surfaceElevated: '#1C2A40',

  walletSurface: '#13263B',
  walletBorder: 'rgba(74, 211, 196, 0.24)',
  walletDivider: 'rgba(205, 232, 239, 0.12)',

  border: 'rgba(157, 178, 205, 0.13)',
  borderStrong: 'rgba(157, 178, 205, 0.22)',
  divider: 'rgba(157, 178, 205, 0.10)',

  text: '#F4F7FB',
  textSecondary: '#9AAAC0',
  textMuted: '#9AAAC0',
  textFaint: '#72839B',
  textInverse: '#052B2C',

  primary: '#22C7B6',
  primaryDark: '#12B6A6',
  primarySoft: 'rgba(34, 199, 182, 0.12)',
  primaryBorder: 'rgba(34, 199, 182, 0.36)',
  accent: '#22C7B6',

  success: '#35C994',
  successSoft: 'rgba(53, 201, 148, 0.12)',
  warning: '#EAB354',
  warningSoft: 'rgba(234, 179, 84, 0.12)',
  danger: '#F06A7E',
  dangerSoft: 'rgba(240, 106, 126, 0.12)',

  notificationDot: '#FF647D',
  overlay: 'rgba(6, 10, 20, 0.78)',
} as const;

export const baseFontFamily = Platform.select({
  web: 'Inter, "Noto Sans Bengali", "Hind Siliguri", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: undefined,
});

export type OperatorCode = 'GP' | 'ROBI' | 'BL' | 'AIRTEL' | 'TELETALK';
export type GatewayCode = 'BKASH' | 'NAGAD' | 'BANK';

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
}

export const OPERATORS: Record<OperatorCode, OperatorMeta> = {
  GP: {
    code: 'GP',
    name: 'Grameenphone',
    bnName: 'গ্রামীণফোন',
    shortLabel: 'GP',
    symbolLabel: 'GP',
    color: '#37D79D',
    softBg: 'rgba(17, 190, 128, 0.14)',
    prefixes: ['017', '013'],
    tagline: '017 · 013 network',
  },
  ROBI: {
    code: 'ROBI',
    name: 'Robi',
    bnName: 'রবি',
    shortLabel: 'Robi',
    symbolLabel: 'ROBI',
    color: '#FF7181',
    softBg: 'rgba(255, 80, 97, 0.13)',
    prefixes: ['018'],
    tagline: '018 network',
  },
  BL: {
    code: 'BL',
    name: 'Banglalink',
    bnName: 'বাংলালিংক',
    shortLabel: 'BL',
    symbolLabel: 'BL',
    color: '#FFA04C',
    softBg: 'rgba(255, 139, 45, 0.14)',
    prefixes: ['019', '014'],
    tagline: '019 · 014 network',
  },
  AIRTEL: {
    code: 'AIRTEL',
    name: 'Airtel',
    bnName: 'এয়ারটেল',
    shortLabel: 'Airtel',
    symbolLabel: 'airtel',
    color: '#FF6B8E',
    softBg: 'rgba(255, 63, 108, 0.13)',
    prefixes: ['016'],
    tagline: '016 network',
  },
  TELETALK: {
    code: 'TELETALK',
    name: 'Teletalk',
    bnName: 'টেলিটক',
    shortLabel: 'Teletalk',
    symbolLabel: 'TT',
    color: '#73B5FF',
    softBg: 'rgba(67, 156, 255, 0.13)',
    prefixes: ['015'],
    tagline: '015 network',
  },
};

export const OPERATOR_LIST: OperatorMeta[] = [
  OPERATORS.GP,
  OPERATORS.ROBI,
  OPERATORS.BL,
  OPERATORS.AIRTEL,
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
