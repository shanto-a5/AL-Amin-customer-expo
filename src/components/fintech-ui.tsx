import { type Href } from 'expo-router';
import * as React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { AppIcon, Logo, Pill, type PillTone } from '@/components/ui';
import type { AppNotification, OfferCategory, OfferDto } from '@/domain/types';
import {
  baseFontFamily,
  colors,
  formatBdt,
  formatBdtNumber,
  OPERATORS,
  OPERATOR_LOGOS,
  radius,
  spacing,
  type,
  type OperatorCode,
  type OperatorMeta,
} from '@/theme/tokens';
import { relativeTime } from '@/utils/time';

// ------------------------------------------------------------------ AppHeader

export function AppHeader({
  unreadCount = 0,
  onPressNotifications,
}: {
  unreadCount?: number;
  onPressNotifications: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.topbar}>
      <View style={styles.brandWrap}>
        <Logo size={46} />
      </View>
      <Pressable
        onPress={onPressNotifications}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      >
        <AppIcon name="bell" size={20} color="#FFFFFF" />
        {unreadCount > 0 ? <View style={styles.notificationDot} /> : null}
      </Pressable>
    </View>
  );
}

// ------------------------------------------------------------------ PageHeader & WalletMiniPill

export function WalletMiniPill({ balance }: { balance: number }): React.JSX.Element {
  return (
    <View style={styles.walletMiniPill} accessibilityLabel={`Wallet balance ${formatBdt(balance, true)}`}>
      <AppIcon name="wallet" size={14} color={colors.primary} />
      <Text style={styles.walletMiniLabel}>Balance</Text>
      <Text style={styles.walletMiniValue}>{formatBdt(balance, true)}</Text>
    </View>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  backFallbackHref,
  rightAccessory,
  actionLabel,
  onAction,
  style,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backFallbackHref?: Href;
  rightAccessory?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const { width } = useWindowDimensions();
  const compact = width <= 360;

  return (
    <View style={[styles.pageHeader, style]}>
      {backFallbackHref || rightAccessory ? (
        <View style={styles.pageTopRow}>
          {backFallbackHref ? <BackButton fallbackHref={backFallbackHref} /> : <View />}
          {rightAccessory ?? null}
        </View>
      ) : null}

      <View style={styles.pageTitleRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {eyebrow ? <Text style={type.eyebrow}>{eyebrow}</Text> : null}
          <Text
            style={[
              styles.pageTitle,
              compact && { fontSize: 23, lineHeight: 29 },
              eyebrow ? { marginTop: 6 } : null,
            ]}
          >
            {title}
          </Text>
          {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={({ pressed }) => [styles.headerActionBtn, pressed && styles.pressed]}
          >
            <Text style={styles.headerActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ WalletBalanceCard

export function WalletBalanceCard({
  balance,
  visible,
  onToggleVisibility,
  customerId,
  onAddMoney,
}: {
  balance: number;
  visible: boolean;
  onToggleVisibility: () => void;
  customerId: string;
  onAddMoney: () => void;
}): React.JSX.Element {
  const { width } = useWindowDimensions();
  const compact = width <= 360;
  const ultraNarrow = width < 340;

  return (
    <View style={[styles.balanceCard, compact && { padding: 18 }]}>
      {/* Restrained geometric ring accent matching HTML benchmark */}
      <View pointerEvents="none" style={styles.balanceRingOuter} />
      <View pointerEvents="none" style={styles.balanceRingInner} />

      <View style={styles.balanceTop}>
        <Text style={styles.balanceLabel}>
          Wallet balance <Text style={styles.balanceLabelBn}>· মূল ব্যালেন্স</Text>
        </Text>
        <Pressable
          onPress={onToggleVisibility}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide wallet balance' : 'Show wallet balance'}
          accessibilityState={{ checked: visible }}
          style={({ pressed }) => [styles.visibilityBtn, pressed && styles.pressed]}
        >
          <AppIcon name={visible ? 'eyeOff' : 'eye'} size={15} color="#B5C6D4" />
          <Text style={styles.visibilityText}>{visible ? 'Hide balance' : 'Show balance'}</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={onToggleVisibility}
        accessibilityRole="button"
        accessibilityLabel={
          visible
            ? `Available balance ${formatBdt(balance, true)}. Tap to hide.`
            : 'Balance hidden. Tap to show balance.'
        }
        style={({ pressed }) => [styles.balanceAmountWrap, pressed && { opacity: 0.88 }]}
      >
        {visible ? (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.balanceAmount, compact && { fontSize: 29, lineHeight: 34 }]}
          >
            <Text style={styles.balanceCurrency}>৳</Text>
            {formatBdtNumber(balance, true)}
          </Text>
        ) : (
          <Text style={[styles.balanceAmountMasked, compact && { fontSize: 28, lineHeight: 34 }]}>
            <Text style={styles.balanceCurrency}>৳</Text> ••••••
          </Text>
        )}
      </Pressable>

      <Text style={styles.balanceCaption}>Available to use</Text>

      <View style={styles.balanceBottom}>
        <View style={styles.accountRefWrap}>
          <Text style={styles.accountRefLabel}>Customer ID</Text>
          <Text numberOfLines={1} style={styles.accountRefValue}>
            {customerId}
          </Text>
        </View>

        <Pressable
          onPress={onAddMoney}
          accessibilityRole="button"
          accessibilityLabel="Add Money to wallet"
          style={({ pressed }) => [
            styles.addMoneyButton,
            compact && { paddingHorizontal: 14, minHeight: 44 },
            pressed && styles.addMoneyButtonPressed,
          ]}
        >
          <AppIcon name="plus" size={16} color={colors.textInverse} />
          <Text style={styles.addMoneyButtonLabel}>
            {ultraNarrow ? 'Add Money' : 'অ্যাড মানি · Add Money'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ OperatorTile

export function OperatorTile({
  operator,
  onPress,
  selected = false,
  style,
}: {
  operator: OperatorMeta;
  onPress: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const { width } = useWindowDimensions();
  const compact = width <= 360;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${operator.name} (${operator.bnName})`}
      style={({ pressed }) => [
        styles.operatorTile,
        compact && styles.operatorTileCompact,
        (pressed || selected) && [
          styles.operatorTilePressed,
          {
            borderColor: operator.color,
            shadowColor: operator.color,
            shadowOpacity: 0.45,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
            elevation: 4,
          },
        ],
        style,
      ]}
    >
      <View
        style={[
          styles.operatorSymbol,
          compact && styles.operatorSymbolCompact,
        ]}
      >
        <Image
          source={OPERATOR_LOGOS[operator.code]}
          style={compact ? styles.operatorLogoCompact : styles.operatorLogo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.operatorCopy}>
        <Text numberOfLines={1} style={styles.operatorName}>
          {operator.name}
        </Text>
        <Text numberOfLines={1} style={styles.operatorBnName}>
          {operator.bnName}
        </Text>
      </View>

      <AppIcon name="chevronRight" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

// ------------------------------------------------------------------ OfferRow

function categoryTagPalette(category: OfferCategory): { bg: string; fg: string; label: string } {
  switch (category) {
    case 'INTERNET':
      return { bg: 'rgba(255, 147, 62, 0.15)', fg: colors.primary, label: 'Internet' };
    case 'MINUTES':
      return { bg: 'rgba(255, 255, 255, 0.12)', fg: '#FFFFFF', label: 'Minutes' };
    case 'COMBO':
    default:
      return { bg: 'rgba(255, 147, 62, 0.15)', fg: colors.primary, label: 'Combo' };
  }
}

function buildOfferDescription(offer: OfferDto): string {
  const parts: string[] = [];
  if (offer.dataMb && offer.dataMb > 0) {
    const gb = offer.dataMb >= 1024 ? `${Math.round((offer.dataMb / 1024) * 10) / 10} GB data` : `${offer.dataMb} MB data`;
    parts.push(gb);
  }
  if (offer.minutes && offer.minutes > 0) {
    parts.push(`${offer.minutes} min`);
  }
  parts.push(`Valid for ${offer.validity}`);
  return parts.join(' · ');
}

export function OfferRow({
  offer,
  onPress,
  showOperator = true,
  selected = false,
  actionLabel = 'View offer →',
}: {
  offer: OfferDto;
  onPress: () => void;
  showOperator?: boolean;
  selected?: boolean;
  actionLabel?: string;
}): React.JSX.Element {
  const opMeta = OPERATORS[offer.operator as OperatorCode] ?? OPERATORS.GP;
  const catStyle = categoryTagPalette(offer.category);
  const subtitle = buildOfferDescription(offer);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${opMeta.name} ${offer.title}, ${formatBdt(offer.price)}, valid ${offer.validity}`}
      style={({ pressed }) => [
        styles.offerRow,
        selected && [
          styles.offerRowSelected,
          {
            borderColor: opMeta.color,
            shadowColor: opMeta.color,
            shadowOpacity: 0.35,
            shadowRadius: 8,
          },
        ],
        pressed && [
          styles.offerRowPressed,
          { borderColor: opMeta.color },
        ],
      ]}
    >
      {showOperator ? (
        <View style={styles.offerLogoWrap}>
          <Image
            source={OPERATOR_LOGOS[opMeta.code]}
            style={styles.offerLogo}
            resizeMode="contain"
          />
        </View>
      ) : null}

      <View style={styles.offerLeft}>
        <View style={styles.offerMetaRow}>
          <View style={[styles.offerTag, { backgroundColor: opMeta.softBg }]}>
            <Text style={[styles.offerTagText, { color: opMeta.color }]}>{opMeta.name}</Text>
          </View>
          <View style={[styles.offerTag, { backgroundColor: catStyle.bg }]}>
            <Text style={[styles.offerTagText, { color: catStyle.fg }]}>{catStyle.label}</Text>
          </View>
          <Text style={styles.offerValidity}>{offer.validity}</Text>
        </View>

        <Text style={styles.offerTitle}>{offer.title}</Text>
        <Text numberOfLines={1} style={styles.offerDesc}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.offerRight}>
        <Text style={styles.offerPrice}>{formatBdt(offer.price)}</Text>
        <Text style={[styles.offerAction, selected && { color: colors.success }]}>
          {actionLabel}
        </Text>
      </View>
    </Pressable>
  );
}

// ------------------------------------------------------------------ NotificationItem

function notificationTone(item: AppNotification): { tone: PillTone; label: string } {
  switch (item.type) {
    case 'security':
      return { tone: 'danger', label: 'Security' };
    case 'alert':
      return { tone: 'danger', label: 'Alert' };
    case 'warning':
      return { tone: 'warning', label: 'Pending' };
    case 'account':
      return { tone: 'success', label: 'Wallet' };
    case 'info':
      return { tone: 'info', label: 'Update' };
    default:
      return { tone: 'neutral', label: 'System' };
  }
}

export function NotificationItem({
  notification,
  onPress,
  onMarkRead,
}: {
  notification: AppNotification;
  onPress: () => void;
  onMarkRead: () => void;
}): React.JSX.Element {
  const meta = notificationTone(notification);

  return (
    <View style={[styles.notifCard, !notification.read && styles.notifCardUnread]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${notification.read ? 'Read' : 'Unread'}: ${notification.title}`}
        style={({ pressed }) => [styles.notifMain, pressed && styles.pressed]}
      >
        <View style={styles.notifHeaderRow}>
          <View style={styles.notifTitleGroup}>
            {!notification.read ? <View style={styles.notifUnreadDot} /> : null}
            <Text numberOfLines={1} style={styles.notifTitle}>
              {notification.title}
            </Text>
          </View>
          <Pill label={meta.label} tone={meta.tone} />
        </View>

        <Text style={styles.notifBody} numberOfLines={2}>
          {notification.body}
        </Text>

        <View style={styles.notifFooterRow}>
          <Text style={styles.notifTime}>{relativeTime(notification.createdAt)}</Text>
          {!notification.read ? (
            <Pressable
              onPress={onMarkRead}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Mark ${notification.title} as read`}
            >
              <Text style={styles.notifMarkAction}>Mark read</Text>
            </Pressable>
          ) : (
            <Text style={styles.notifReadLabel}>Read</Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 26,
  },
  brandWrap: {
    flex: 1,
    minWidth: 0,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.notificationDot,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },

  walletMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletMiniLabel: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    color: colors.textMuted,
  },
  walletMiniValue: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
  },

  pageHeader: {
    marginBottom: 18,
  },
  pageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 14,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pageTitle: {
    ...type.h1,
  },
  pageSubtitle: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: 6,
  },
  headerActionBtn: {
    paddingVertical: 5,
    paddingLeft: 8,
  },
  headerActionText: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },

  balanceCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 22,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.walletBorder,
    backgroundColor: '#000000',
    marginBottom: 4,
  },
  balanceRingOuter: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -88,
    top: -108,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  balanceRingInner: {
    position: 'absolute',
    width: 236,
    height: 236,
    borderRadius: 118,
    right: -111,
    top: -131,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  balanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  balanceLabel: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: '#D0D0D0',
    flexShrink: 1,
  },
  balanceLabelBn: {
    color: '#A0A0A0',
  },
  visibilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingLeft: 8,
  },
  visibilityText: {
    fontFamily: baseFontFamily,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '600',
    color: '#D0D0D0',
  },
  balanceAmountWrap: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  balanceAmount: {
    fontFamily: baseFontFamily,
    fontSize: 33,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1.0,
    color: colors.text,
  },
  balanceAmountMasked: {
    fontFamily: baseFontFamily,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.text,
  },
  balanceCurrency: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceCaption: {
    fontFamily: baseFontFamily,
    marginTop: 5,
    fontSize: 11.5,
    lineHeight: 15,
    color: '#A0A0A0',
  },
  balanceBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.walletDivider,
  },
  accountRefWrap: {
    minWidth: 96,
    flexShrink: 1,
  },
  accountRefLabel: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    lineHeight: 15,
    color: '#A0A0A0',
  },
  accountRefValue: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#FFFFFF',
    marginTop: 2,
  },
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  addMoneyButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  addMoneyButtonLabel: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: '#000000',
  },

  operatorTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minWidth: 0,
    minHeight: 64,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  operatorTileCompact: {
    paddingVertical: 11,
    paddingHorizontal: 9,
    gap: 8,
  },
  operatorTilePressed: {
    backgroundColor: '#000000',
    borderColor: colors.primary,
  },
  operatorSymbol: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  operatorSymbolCompact: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  operatorLogo: {
    width: 40,
    height: 40,
  },
  operatorLogoCompact: {
    width: 34,
    height: 34,
  },
  operatorCopy: {
    flex: 1,
    minWidth: 0,
  },
  operatorName: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.text,
  },
  operatorBnName: {
    fontFamily: baseFontFamily,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: 2,
  },

  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 15,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offerLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  offerLogo: {
    width: 40,
    height: 40,
  },
  offerRowSelected: {
    backgroundColor: 'rgba(255, 147, 62, 0.12)',
    borderColor: colors.primary,
  },
  offerRowPressed: {
    borderColor: colors.primary,
    backgroundColor: '#000000',
  },
  offerLeft: {
    flex: 1,
    minWidth: 0,
  },
  offerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 7,
  },
  offerTag: {
    borderRadius: 7,
    paddingVertical: 3.5,
    paddingHorizontal: 7,
  },
  offerTagText: {
    fontFamily: baseFontFamily,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  offerValidity: {
    fontFamily: baseFontFamily,
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.textMuted,
  },
  offerTitle: {
    fontFamily: baseFontFamily,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '700',
    color: colors.text,
  },
  offerDesc: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: 4,
  },
  offerRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  offerPrice: {
    fontFamily: baseFontFamily,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.text,
  },
  offerAction: {
    fontFamily: baseFontFamily,
    marginTop: 5,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '700',
    color: colors.primary,
  },

  notifCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifCardUnread: {
    borderColor: colors.primary,
    backgroundColor: '#000000',
  },
  notifMain: {
    padding: 15,
    gap: 6,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  notifTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    minWidth: 0,
  },
  notifUnreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  notifTitle: {
    fontFamily: baseFontFamily,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  notifBody: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
  },
  notifFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  notifTime: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    color: colors.textFaint,
  },
  notifMarkAction: {
    fontFamily: baseFontFamily,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  notifReadLabel: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    color: colors.textFaint,
  },
});
