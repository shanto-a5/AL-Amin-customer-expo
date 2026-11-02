import * as React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Image,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, type, makeShadow, row } from '@/theme/tokens';
import { useCustomerDockClearance } from '@/components/customer-dock-inset';
import { resolveImage } from '@/utils/image';

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';

const BTN_BG: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.primarySoft,
  ghost: 'transparent',
  danger: colors.danger,
  accent: colors.accent,
};
const BTN_FG: Record<Variant, string> = {
  primary: colors.textInverse,
  secondary: colors.primary,
  ghost: colors.primary,
  danger: '#FFFFFF',
  accent: '#FFFFFF',
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth,
  accessibilityLabel,
  style,
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: BTN_BG[variant] },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
        isDisabled && styles.disabledDim,
        pressed && !isDisabled && styles.pressed,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={BTN_FG[variant]} />
      ) : (
        <Text style={[styles.buttonLabel, { color: BTN_FG[variant] }]}>{title}</Text>
      )}
    </Pressable>
  );
}

interface FieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string | null;
  hint?: string;
  multiline?: boolean;
  minHeight?: number;
  maxLength?: number;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Field({
  value,
  onChangeText,
  placeholder,
  label,
  secure,
  keyboardType,
  autoCapitalize,
  error,
  hint,
  multiline,
  minHeight,
  maxLength,
  onSubmitEditing,
  returnKeyType,
  accessibilityLabel,
  style,
}: FieldProps): React.JSX.Element {
  return (
    <View style={[styles.fieldGroup, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={accessibilityLabel ?? label}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        multiline={multiline}
        maxLength={maxLength}
        style={[
          styles.input,
          multiline ? { minHeight: minHeight ?? 96, textAlignVertical: 'top', paddingTop: spacing.md } : null,
          error ? styles.inputError : null,
        ]}
        textContentType="none"
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  centered?: boolean;
  backgroundColor?: string;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  centered,
  backgroundColor,
  refreshControl,
}: ScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const topInset = { paddingTop: (padded ? spacing.lg : 0) + insets.top };
  const dockClearance = useCustomerDockClearance();
  const bottomInset = dockClearance
    ? { paddingBottom: (padded ? spacing.lg : 0) + dockClearance }
    : null;
  if (!scroll) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[styles.screen, backgroundColor ? { backgroundColor } : null]}>
          <View
            style={[
              styles.screenFill,
              padded && styles.screenPadded,
              centered && styles.screenCentered,
              topInset,
              bottomInset,
            ]}
          >
            {children}
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.screen, backgroundColor ? { backgroundColor } : null]}>
        <ScrollView
          contentContainerStyle={centered ? styles.screenCentered : undefined}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={refreshControl}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View
              style={[
                styles.screenInner,
                padded && styles.screenPadded,
                centered && styles.screenCentered,
                topInset,
                bottomInset,
              ]}
            >
              {children}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

interface CardProps {
  children: React.ReactNode;
  padded?: boolean;
  style?: ViewStyle;
}

export function Card({ children, padded = true, style }: CardProps): React.JSX.Element {
  return <View style={[styles.card, padded && styles.cardPadded, style]}>{children}</View>;
}

interface SectionHeaderProps {
  title: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, caption, actionLabel, onAction }: SectionHeaderProps): React.JSX.Element {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function taka(value: number): string {
  return `৳${value.toLocaleString('en-IN')}`;
}

export function AvatarImage({
  uri,
  size,
  cornerRadius = radius.md,
  emojiScale = 0.42,
}: {
  uri?: string | null;
  size: number;
  cornerRadius?: number;
  emojiScale?: number;
}): React.JSX.Element {
  const resolved = resolveImage(uri);
  const box = { width: size, height: size, borderRadius: cornerRadius };
  if (!resolved) {
    return <View style={[styles.thumb, box, { backgroundColor: colors.surfaceMuted }]} />;
  }
  if (resolved.kind === 'uri') {
    return (
      <ExpoImage
        source={resolved.uri}
        contentFit="cover"
        transition={150}
        style={[styles.thumb, box, { backgroundColor: colors.surfaceMuted }]}
      />
    );
  }
  return (
    <View style={[styles.thumb, box, { backgroundColor: resolved.c1 }]}>
      <Text style={{ fontSize: Math.round(size * emojiScale) }}>{resolved.emoji}</Text>
    </View>
  );
}

/** Backwards-compatible alias for media thumbnails. */
export const ProductImage = AvatarImage;

export function Logo({
  size = 54,
  showBrandText = true,
  style,
}: {
  size?: number;
  showBrandText?: boolean;
  style?: ViewStyle;
}): React.JSX.Element {
  const iconSize = Math.min(Math.max(size, 42), 72);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }, style]}>
      <View
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: radius.md,
          overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: colors.primary,
          backgroundColor: colors.surface,
        }}
      >
        <Image
          source={require('../../assets/images/allpay-logo.jpeg')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          accessibilityLabel="AllPay BD Logo"
        />
      </View>
      {showBrandText ? (
        <View style={{ flexShrink: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
            AllPay BD • অল পে বিডি
          </Text>
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 2 }}>
            ফ্লেক্সিলোড • ইন্টারনেট প্যাক • ডিজিটাল ওয়ালেট
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ Generic UI primitives

export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const PILL_BG: Record<PillTone, string> = {
  neutral: colors.surfaceMuted,
  info: colors.primarySoft,
  success: colors.successSoft,
  warning: '#2D210B',
  danger: colors.dangerSoft,
};

const PILL_FG: Record<PillTone, string> = {
  neutral: colors.textMuted,
  info: colors.primary,
  success: colors.success,
  warning: '#F59E0B',
  danger: colors.danger,
};

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }): React.JSX.Element {
  return (
    <View style={[styles.pill, { backgroundColor: PILL_BG[tone] }]}>
      <Text style={[styles.pillLabel, { color: PILL_FG[tone] }]}>{label}</Text>
    </View>
  );
}

export function FilterTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}): React.JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.tabsScroll}
      contentContainerStyle={styles.tabsRow}
    >
      {tabs.map((tab) => {
        const selected = active === tab.key;
        const text = tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={text}
            style={[styles.tab, selected ? styles.tabOn : null]}
          >
            <Text style={[styles.tabLabel, selected ? styles.tabLabelOn : null]}>{text}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.md }}>
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

export function NoticeCard({
  title,
  message,
  tone = 'neutral',
  actionLabel,
  onAction,
  onDismiss,
}: {
  title: string;
  message: string;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}): React.JSX.Element {
  const toneStyle =
    tone === 'danger'
      ? styles.noticeDanger
      : tone === 'warning'
        ? styles.noticeWarning
        : tone === 'success'
          ? styles.noticeSuccess
          : styles.noticeNeutral;
  return (
    <View style={[styles.notice, toneStyle]}>
      <View style={styles.noticeHeader}>
        <Text style={styles.noticeTitle}>{title}</Text>
        {onDismiss ? (
          <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss notice">
            <Text style={styles.noticeDismiss}>Dismiss</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.noticeBody}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel} style={styles.noticeAction}>
          <Text style={styles.noticeActionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SummaryRow({
  label,
  value,
  tone = 'normal',
}: {
  label: string;
  value: string;
  tone?: 'normal' | 'muted' | 'discount' | 'strong';
}): React.JSX.Element {
  const valueStyle =
    tone === 'strong'
      ? styles.summaryStrong
      : tone === 'discount'
        ? styles.summaryDiscount
        : tone === 'muted'
          ? styles.summaryMuted
          : styles.summaryNormal;
  return (
    <View style={styles.summaryRow}>
      <Text style={tone === 'strong' ? styles.summaryStrong : styles.summaryLabel}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
}

export function MetricCard({
  label,
  value,
  caption,
  tone = 'default',
  onPress,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: 'default' | 'warning' | 'success';
  onPress?: () => void;
  accessibilityLabel?: string;
}): React.JSX.Element {
  const valueColor =
    tone === 'warning' ? colors.danger : tone === 'success' ? colors.success : colors.text;
  const inner = (
    <View style={styles.metricCard}>
      <Text style={type.caption}>{label}</Text>
      <Text style={[type.h2, { color: valueColor, marginTop: spacing.xs }]}>{value}</Text>
      {caption ? <Text style={[type.caption, { marginTop: 2 }]}>{caption}</Text> : null}
    </View>
  );
  if (!onPress) return <View style={{ flex: 1 }}>{inner}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
      style={({ pressed }) => [{ flex: 1 }, pressed && styles.pressed]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenFill: { flex: 1 },
  screenInner: { flexGrow: 1 },
  screenPadded: { padding: spacing.lg },
  screenCentered: { justifyContent: 'center', alignItems: 'center' },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
  },
  buttonLabel: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  disabledDim: { opacity: 0.5 },
  pressed: { opacity: 0.86 },
  fullWidth: { alignSelf: 'stretch' },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { ...type.label, color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
  fieldHint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...makeShadow(1),
  },
  cardPadded: { padding: spacing.lg },
  sectionHeader: { ...row('space-between'), marginBottom: spacing.md, marginTop: spacing.sm },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { ...type.h3, color: colors.text },
  sectionCaption: { ...type.caption, marginTop: 2 },
  sectionAction: { color: colors.primary, fontSize: 13, fontWeight: '700', marginLeft: spacing.md },
  thumb: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  tabsScroll: { flexGrow: 0, flexShrink: 0, marginBottom: spacing.md },
  tabsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tabLabel: { ...type.label, color: colors.textMuted },
  tabLabelOn: { color: colors.primary },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: { ...type.h2, color: colors.text, textAlign: 'center' },
  emptyMessage: { ...type.bodyMuted, textAlign: 'center', marginTop: spacing.xs },
  notice: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    marginBottom: spacing.md,
  },
  noticeNeutral: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  noticeWarning: { backgroundColor: '#1E1607', borderColor: '#F59E0B' },
  noticeDanger: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  noticeSuccess: { backgroundColor: colors.successSoft, borderColor: colors.success },
  noticeHeader: { ...row('space-between') },
  noticeTitle: { ...type.label, color: colors.text },
  noticeBody: { ...type.caption, color: colors.text },
  noticeDismiss: { ...type.caption, color: colors.textMuted, fontWeight: '700' },
  noticeAction: { marginTop: spacing.xs, alignSelf: 'flex-start' },
  noticeActionLabel: { ...type.label, color: colors.primary },
  summaryRow: { ...row('space-between'), paddingVertical: 4 },
  summaryLabel: { ...type.body, color: colors.textMuted },
  summaryNormal: { ...type.label, color: colors.text },
  summaryMuted: { ...type.body, color: colors.textMuted },
  summaryDiscount: { ...type.label, color: colors.success },
  summaryStrong: { ...type.h3, color: colors.text },
  metricCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
});
