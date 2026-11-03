import { Image as ExpoImage } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import mediumWeight from 'expo-symbols/androidWeights/medium';
import * as React from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCustomerDockClearance } from '@/components/customer-dock-inset';
import {
  baseFontFamily,
  colors,
  makeShadow,
  radius,
  row,
  spacing,
  type,
} from '@/theme/tokens';
import { isPaletteImage, resolveImage } from '@/utils/image';

const ICON_WEIGHT = { ios: 'medium' as const, android: mediumWeight };

export type AppIconName =
  | 'bell'
  | 'eye'
  | 'eyeOff'
  | 'plus'
  | 'chevronRight'
  | 'back'
  | 'check'
  | 'checkCircle'
  | 'clock'
  | 'alert'
  | 'warning'
  | 'info'
  | 'lock'
  | 'key'
  | 'logout'
  | 'camera'
  | 'share'
  | 'receipt'
  | 'bolt'
  | 'wallet'
  | 'close'
  | 'person'
  | 'offers'
  | 'shield';

const ICON_MAP: Record<
  AppIconName,
  {
    ios: string;
    android: string;
    web: string;
  }
> = {
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  eyeOff: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  back: { ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  checkCircle: { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  alert: { ios: 'exclamationmark.circle', android: 'error', web: 'error' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
  key: { ios: 'key', android: 'key', web: 'key' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  receipt: { ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' },
  bolt: { ios: 'bolt', android: 'bolt', web: 'bolt' },
  wallet: {
    ios: 'creditcard',
    android: 'account_balance_wallet',
    web: 'account_balance_wallet',
  },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  person: { ios: 'person', android: 'person', web: 'person' },
  offers: { ios: 'sparkles', android: 'local_offer', web: 'local_offer' },
  shield: { ios: 'shield', android: 'shield', web: 'shield' },
};

export function AppIcon({
  name,
  size = 18,
  color = colors.text,
  style,
}: {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const spec = ICON_MAP[name];
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <SymbolView
        name={spec as never}
        size={size}
        weight={ICON_WEIGHT}
        tintColor={color}
      />
    </View>
  );
}

// ------------------------------------------------------------------ Buttons

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';

const BTN_BG: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.surfaceSecondary,
  ghost: 'transparent',
  danger: colors.dangerSoft,
  accent: colors.primary,
};

const BTN_PRESSED_BG: Record<Variant, string> = {
  primary: colors.primaryDark,
  secondary: colors.surfaceElevated,
  ghost: 'rgba(157, 178, 205, 0.08)',
  danger: 'rgba(240, 106, 126, 0.20)',
  accent: colors.primaryDark,
};

const BTN_FG: Record<Variant, string> = {
  primary: colors.textInverse,
  secondary: colors.text,
  ghost: colors.primary,
  danger: '#FF8596',
  accent: colors.textInverse,
};

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: AppIconName;
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
  icon,
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
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed && !isDisabled ? BTN_PRESSED_BG[variant] : BTN_BG[variant] },
        variant === 'secondary' && styles.buttonSecondaryBorder,
        variant === 'danger' && styles.buttonDangerBorder,
        variant === 'ghost' && styles.buttonGhost,
        isDisabled && styles.disabledDim,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={BTN_FG[variant]} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <AppIcon name={icon} size={16} color={BTN_FG[variant]} /> : null}
          <Text
            style={[
              styles.buttonLabel,
              { color: BTN_FG[variant] },
              variant === 'secondary' && { fontWeight: '600' },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function PrimaryButton(props: Omit<ButtonProps, 'variant'>): React.JSX.Element {
  return <Button {...props} variant="primary" />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>): React.JSX.Element {
  return <Button {...props} variant="secondary" />;
}

// ------------------------------------------------------------------ FormField / Field

export interface FieldProps {
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
  rightAccessory?: React.ReactNode;
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
  rightAccessory,
  style,
}: FieldProps): React.JSX.Element {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={[styles.fieldGroup, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocused,
          error ? styles.inputWrapError : null,
        ]}
      >
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            multiline
              ? { minHeight: minHeight ?? 92, textAlignVertical: 'top', paddingTop: spacing.md }
              : null,
          ]}
          textContentType="none"
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />
        {rightAccessory ? <View style={styles.inputAccessory}>{rightAccessory}</View> : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export const FormField = Field;

// ------------------------------------------------------------------ Screen

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
  const { width } = useWindowDimensions();
  const horizontalPad = padded ? (width <= 360 ? 15 : 20) : 0;
  const topInset = { paddingTop: (padded ? 18 : 0) + insets.top };
  const dockClearance = useCustomerDockClearance();
  const bottomInset = dockClearance
    ? { paddingBottom: dockClearance }
    : { paddingBottom: (padded ? spacing.xxl : 0) + insets.bottom };

  if (!scroll) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[styles.screen, backgroundColor ? { backgroundColor } : null]}>
          <View
            style={[
              styles.screenFill,
              padded && { paddingHorizontal: horizontalPad },
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
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View
              style={[
                styles.screenInner,
                padded && { paddingHorizontal: horizontalPad },
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

// ------------------------------------------------------------------ Card & SectionHeader

interface CardProps {
  children: React.ReactNode;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, padded = true, style }: CardProps): React.JSX.Element {
  return <View style={[styles.card, padded && styles.cardPadded, style]}>{children}</View>;
}

export interface SectionHeaderProps {
  title: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({
  title,
  caption,
  actionLabel,
  onAction,
}: SectionHeaderProps): React.JSX.Element {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.sectionActionBtn, pressed && { opacity: 0.75 }]}
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

// ------------------------------------------------------------------ Avatar & Brand Logo

export function AvatarImage({
  uri,
  name,
  size,
  cornerRadius = radius.pill,
}: {
  uri?: string | null;
  name?: string | null;
  size: number;
  cornerRadius?: number;
  emojiScale?: number;
}): React.JSX.Element {
  const resolved = resolveImage(uri);
  const box = { width: size, height: size, borderRadius: cornerRadius };

  if (resolved && resolved.kind === 'uri' && !isPaletteImage(uri)) {
    return (
      <ExpoImage
        source={resolved.uri}
        contentFit="cover"
        transition={120}
        style={[styles.thumb, box, styles.avatarSurface]}
      />
    );
  }

  const cleanName = (name ?? '').trim();
  const initials = cleanName
    ? cleanName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
    : '';

  return (
    <View style={[styles.thumb, box, styles.avatarFallback]}>
      {initials ? (
        <Text
          style={{
            fontFamily: baseFontFamily,
            fontSize: Math.max(12, Math.round(size * 0.34)),
            fontWeight: '700',
            color: colors.primary,
          }}
        >
          {initials}
        </Text>
      ) : (
        <AppIcon name="person" size={Math.max(16, Math.round(size * 0.44))} color={colors.primary} />
      )}
    </View>
  );
}

export const ProductImage = AvatarImage;

export function Logo({
  size = 46,
  showBrandText = true,
  tagline = 'ফ্লেক্সিলোড · ইন্টারনেট প্যাক · ডিজিটাল ওয়ালেট',
  style,
}: {
  size?: number;
  showBrandText?: boolean;
  tagline?: string;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const iconSize = Math.min(Math.max(size, 38), 60);
  return (
    <View style={[styles.brandLockup, style]}>
      <View
        style={[
          styles.brandMark,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: Math.round(iconSize * 0.32),
          },
        ]}
      >
        <Image
          source={require('../../assets/images/allpay-logo.jpeg')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          accessibilityLabel="AllPay BD"
        />
      </View>
      {showBrandText ? (
        <View style={styles.brandCopy}>
          <Text numberOfLines={1} style={styles.brandName}>
            AllPay BD
          </Text>
          {tagline ? (
            <Text numberOfLines={1} style={styles.brandTagline}>
              {tagline}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ Pills, StatusIndicator & FilterChips

export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const PILL_BG: Record<PillTone, string> = {
  neutral: colors.surfaceSecondary,
  info: colors.primarySoft,
  success: colors.successSoft,
  warning: colors.warningSoft,
  danger: colors.dangerSoft,
};

const PILL_FG: Record<PillTone, string> = {
  neutral: colors.textMuted,
  info: colors.primary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }): React.JSX.Element {
  return (
    <View style={[styles.pill, { backgroundColor: PILL_BG[tone] }]}>
      <Text style={[styles.pillLabel, { color: PILL_FG[tone] }]}>{label}</Text>
    </View>
  );
}

export function StatusIndicator({
  status,
  label,
}: {
  status: 'COMPLETED' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'VERIFIED' | 'ADMIN' | 'ACTIVE' | 'DISABLED';
  label?: string;
}): React.JSX.Element {
  const config: { tone: PillTone; icon: AppIconName; defaultLabel: string } = (() => {
    switch (status) {
      case 'COMPLETED':
        return { tone: 'success', icon: 'checkCircle', defaultLabel: 'Completed' };
      case 'VERIFIED':
        return { tone: 'success', icon: 'checkCircle', defaultLabel: 'Verified' };
      case 'ACTIVE':
        return { tone: 'success', icon: 'checkCircle', defaultLabel: 'Active' };
      case 'PROCESSING':
      case 'PENDING':
        return { tone: 'warning', icon: 'clock', defaultLabel: status === 'PENDING' ? 'Pending' : 'Processing' };
      case 'FAILED':
        return { tone: 'danger', icon: 'alert', defaultLabel: 'Failed' };
      case 'ADMIN':
        return { tone: 'info', icon: 'shield', defaultLabel: 'Admin' };
      case 'DISABLED':
      default:
        return { tone: 'neutral', icon: 'info', defaultLabel: 'Disabled' };
    }
  })();

  const displayLabel = label ?? config.defaultLabel;
  const fg = PILL_FG[config.tone];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Status: ${displayLabel}`}
      style={[styles.statusBadge, { backgroundColor: PILL_BG[config.tone] }]}
    >
      <AppIcon name={config.icon} size={12} color={fg} />
      <Text style={[styles.statusLabel, { color: fg }]}>{displayLabel}</Text>
    </View>
  );
}

export interface FilterChipItem {
  key: string;
  label: string;
  count?: number;
  accentColor?: string;
}

export function FilterChip({
  label,
  count,
  selected,
  accentColor,
  onPress,
}: {
  label: string;
  count?: number;
  selected: boolean;
  accentColor?: string;
  onPress: () => void;
}): React.JSX.Element {
  const text = count !== undefined ? `${label} (${count})` : label;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={text}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : null,
        pressed && { opacity: 0.8 },
      ]}
    >
      {accentColor ? (
        <View style={[styles.chipDot, { backgroundColor: accentColor }]} />
      ) : null}
      <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}>
        {text}
      </Text>
    </Pressable>
  );
}

export function FilterTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: FilterChipItem[];
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
      {tabs.map((tab) => (
        <FilterChip
          key={tab.key}
          label={tab.label}
          count={tab.count}
          accentColor={tab.accentColor}
          selected={active === tab.key}
          onPress={() => onChange(tab.key)}
        />
      ))}
    </ScrollView>
  );
}

// ------------------------------------------------------------------ Empty, LoadingSkeleton, Notice & Rows

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
      <View style={styles.emptyIconCircle}>
        <AppIcon name="info" size={20} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.lg }}>
          <SecondaryButton title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

export function LoadingSkeleton({
  rows = 3,
  height = 74,
}: {
  rows?: number;
  height?: number;
}): React.JSX.Element {
  const [pulse] = React.useState(() => new Animated.Value(0.65));

  React.useEffect(() => {
    let mounted = true;
    let loop: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (!mounted || reduceMotion) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0.55, duration: 750, useNativeDriver: true }),
          ]),
        );
        loop.start();
      })
      .catch(() => {
        // Ignore if unavailable
      });

    return () => {
      mounted = false;
      loop?.stop();
    };
  }, [pulse]);

  return (
    <View accessibilityLabel="Loading content" style={{ gap: 10 }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <Animated.View
          key={idx}
          style={[
            styles.skeletonItem,
            { height, opacity: pulse },
          ]}
        />
      ))}
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
  const iconName: AppIconName =
    tone === 'danger'
      ? 'alert'
      : tone === 'warning'
        ? 'warning'
        : tone === 'success'
          ? 'checkCircle'
          : 'info';
  const iconColor =
    tone === 'danger'
      ? colors.danger
      : tone === 'warning'
        ? colors.warning
        : tone === 'success'
          ? colors.success
          : colors.primary;

  return (
    <View accessibilityRole="alert" style={[styles.notice, toneStyle]}>
      <View style={styles.noticeHeader}>
        <View style={styles.noticeTitleWrap}>
          <AppIcon name={iconName} size={16} color={iconColor} />
          <Text style={styles.noticeTitle}>{title}</Text>
        </View>
        {onDismiss ? (
          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notice"
          >
            <AppIcon name="close" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.noticeBody}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.noticeAction}
        >
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
  actionLabel,
  onAction,
  showDivider = false,
}: {
  label: string;
  value: string;
  tone?: 'normal' | 'muted' | 'discount' | 'strong';
  actionLabel?: string;
  onAction?: () => void;
  showDivider?: boolean;
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
    <View style={[styles.summaryRow, showDivider && styles.summaryRowDivider]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <View style={styles.summaryValueWrap}>
        <Text selectable style={valueStyle}>
          {value}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`${actionLabel} ${label}`}
            style={styles.summaryActionBtn}
          >
            <Text style={styles.summaryActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
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
    tone === 'warning' ? colors.warning : tone === 'success' ? colors.success : colors.text;
  const inner = (
    <View style={styles.metricCard}>
      <Text style={type.caption}>{label}</Text>
      <Text style={[type.h2, { color: valueColor, marginTop: spacing.xs }]}>{value}</Text>
      {caption ? <Text style={[type.meta, { marginTop: 3 }]}>{caption}</Text> : null}
    </View>
  );
  if (!onPress) return <View style={{ flex: 1 }}>{inner}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
      style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.85 }]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenFill: { flex: 1 },
  screenInner: { flexGrow: 1 },
  screenCentered: { justifyContent: 'center', alignItems: 'center' },

  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 18,
    minHeight: 46,
  },
  buttonSecondaryBorder: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  buttonDangerBorder: {
    borderWidth: 1,
    borderColor: 'rgba(240, 106, 126, 0.30)',
  },
  buttonGhost: {
    paddingHorizontal: 10,
    minHeight: 40,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonLabel: {
    fontFamily: baseFontFamily,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
  },
  disabledDim: { opacity: 0.48 },
  fullWidth: { alignSelf: 'stretch' },

  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
    color: '#DCE6F2',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    minHeight: 46,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: '#152236',
  },
  inputWrapError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    fontFamily: baseFontFamily,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
    color: colors.text,
  },
  inputAccessory: {
    paddingRight: 10,
  },
  fieldError: {
    fontFamily: baseFontFamily,
    color: colors.danger,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 5,
  },
  fieldHint: {
    fontFamily: baseFontFamily,
    color: colors.textFaint,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 5,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPadded: { padding: spacing.lg },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: 13,
    marginTop: spacing.xs,
  },
  sectionHeaderText: { flex: 1, minWidth: 0 },
  sectionTitle: {
    fontFamily: baseFontFamily,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
  },
  sectionCaption: {
    fontFamily: baseFontFamily,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 4,
  },
  sectionActionBtn: {
    paddingVertical: 4,
    paddingLeft: 8,
  },
  sectionAction: {
    fontFamily: baseFontFamily,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  thumb: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarSurface: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarFallback: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },

  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
    minWidth: 0,
  },
  brandMark: {
    overflow: 'hidden',
    backgroundColor: '#EAFBF8',
    borderWidth: 1,
    borderColor: 'rgba(34, 199, 182, 0.25)',
    ...makeShadow(1),
  },
  brandCopy: { flexShrink: 1, minWidth: 0 },
  brandName: {
    fontFamily: baseFontFamily,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.35,
    color: colors.text,
  },
  brandTagline: {
    fontFamily: baseFontFamily,
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
  },

  pill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
  },
  pillLabel: {
    fontFamily: baseFontFamily,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
  },
  statusLabel: {
    fontFamily: baseFontFamily,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '700',
  },

  tabsScroll: { flexGrow: 0, flexShrink: 0, marginBottom: 12 },
  tabsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipLabel: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...type.h3,
    color: colors.text,
    textAlign: 'center',
  },
  emptyMessage: {
    ...type.caption,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },

  skeletonItem: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  notice: {
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 5,
    marginBottom: spacing.md,
  },
  noticeNeutral: { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderStrong },
  noticeWarning: { backgroundColor: colors.warningSoft, borderColor: 'rgba(234, 179, 84, 0.30)' },
  noticeDanger: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(240, 106, 126, 0.30)' },
  noticeSuccess: { backgroundColor: colors.successSoft, borderColor: 'rgba(53, 201, 148, 0.30)' },
  noticeHeader: { ...row('space-between') },
  noticeTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  noticeTitle: { ...type.label, color: colors.text, flex: 1 },
  noticeBody: { ...type.caption, color: colors.textMuted, paddingLeft: 23 },
  noticeAction: { marginTop: spacing.xs, paddingLeft: 23, alignSelf: 'flex-start' },
  noticeActionLabel: { ...type.label, color: colors.primary },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 9,
  },
  summaryRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  summaryLabel: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    flexShrink: 0,
  },
  summaryValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flex: 1,
  },
  summaryNormal: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  summaryMuted: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'right',
  },
  summaryDiscount: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.success,
    textAlign: 'right',
  },
  summaryStrong: {
    fontFamily: baseFontFamily,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  summaryActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  summaryActionText: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  metricCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
