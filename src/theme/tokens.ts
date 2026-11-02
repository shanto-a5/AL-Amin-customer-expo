import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

/**
 * AllPay BD (অল পে বিডি) Design Tokens — sleek dark fintech palette with
 * operator and gateway signature accents.
 */
export const colors = {
  primary: '#14B8A6',
  primaryDark: '#0D9488',
  primarySoft: '#0F292A',
  accent: '#06B6D4',
  surface: '#0F172A',
  surfaceElevated: '#1E293B',
  surfaceMuted: '#1E293B',
  background: '#000000',
  border: '#334155',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textFaint: '#64748B',
  textInverse: '#042F2E',
  danger: '#EF4444',
  dangerSoft: '#2A1215',
  warning: '#F59E0B',
  warningSoft: '#2D210B',
  success: '#10B981',
  successSoft: '#062E22',
  overlay: 'rgba(2, 6, 23, 0.84)',
} as const;

export type OperatorCode = 'GP' | 'ROBI' | 'BL' | 'AIRTEL' | 'TELETALK';
export type GatewayCode = 'BKASH' | 'NAGAD' | 'BANK';

export interface OperatorMeta {
  code: OperatorCode;
  name: string;
  bnName: string;
  shortLabel: string;
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
    color: '#10B981',
    softBg: 'rgba(16, 185, 129, 0.14)',
    prefixes: ['017', '013'],
    tagline: '017 • 013 নেটওয়ার্ক',
  },
  ROBI: {
    code: 'ROBI',
    name: 'Robi',
    bnName: 'রবি',
    shortLabel: 'ROBI',
    color: '#EF4444',
    softBg: 'rgba(239, 68, 68, 0.14)',
    prefixes: ['018'],
    tagline: '018 নেটওয়ার্ক',
  },
  BL: {
    code: 'BL',
    name: 'Banglalink',
    bnName: 'বাংলালিংক',
    shortLabel: 'BL',
    color: '#F97316',
    softBg: 'rgba(249, 115, 22, 0.14)',
    prefixes: ['019', '014'],
    tagline: '019 • 014 নেটওয়ার্ক',
  },
  AIRTEL: {
    code: 'AIRTEL',
    name: 'Airtel',
    bnName: 'এয়ারটেল',
    shortLabel: 'AIRTEL',
    color: '#F43F5E',
    softBg: 'rgba(244, 63, 94, 0.14)',
    prefixes: ['016'],
    tagline: '016 নেটওয়ার্ক',
  },
  TELETALK: {
    code: 'TELETALK',
    name: 'Teletalk',
    bnName: 'টেলিটক',
    shortLabel: 'TT',
    color: '#14B8A6',
    softBg: 'rgba(20, 184, 166, 0.14)',
    prefixes: ['015'],
    tagline: '015 নেটওয়ার্ক',
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
    color: '#E2136E',
    softBg: 'rgba(226, 19, 110, 0.15)',
    placeholder: '01XXXXXXXXX (বিকাশ নম্বর)',
    subtitle: 'Instant bKash Wallet Transfer',
  },
  NAGAD: {
    code: 'NAGAD',
    name: 'Nagad',
    bnName: 'নগদ',
    color: '#F7941D',
    softBg: 'rgba(247, 148, 29, 0.15)',
    placeholder: '01XXXXXXXXX (নগদ নম্বর)',
    subtitle: 'Instant Nagad Cash-In',
  },
  BANK: {
    code: 'BANK',
    name: 'Bank Account',
    bnName: 'ব্যাংক অ্যাকাউন্ট',
    color: '#3B82F6',
    softBg: 'rgba(59, 130, 246, 0.15)',
    placeholder: 'Account / Card Number',
    subtitle: 'NPSB / BEFTN / Visa & MasterCard',
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

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const type = {
  display: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: colors.text } as TextStyle,
  h1: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3, color: colors.text } as TextStyle,
  h2: { fontSize: 18, fontWeight: '700', color: colors.text } as TextStyle,
  h3: { fontSize: 15, fontWeight: '600', color: colors.text } as TextStyle,
  body: { fontSize: 14, lineHeight: 20, color: colors.text } as TextStyle,
  bodyMuted: { fontSize: 14, lineHeight: 20, color: colors.textMuted } as TextStyle,
  caption: { fontSize: 12, color: colors.textMuted } as TextStyle,
  label: { fontSize: 13, fontWeight: '600', color: colors.text } as TextStyle,
} as const;

export function makeShadow(elevation = 2): ViewStyle {
  return {
    shadowColor: '#000000',
    shadowOpacity: elevation > 0 ? 0.45 : 0,
    shadowRadius: 4 + elevation * 2,
    shadowOffset: { width: 0, height: 1 + elevation },
    elevation,
  };
}

export function row(justify: 'flex-start' | 'center' | 'space-between' | 'flex-end' = 'space-between'): ViewStyle {
  return { flexDirection: 'row', alignItems: 'center', justifyContent: justify };
}

export const layout = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padded: { padding: spacing.lg },
});
