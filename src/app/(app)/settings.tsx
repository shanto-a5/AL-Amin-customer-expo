import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { vantaApi } from '@/api/vanta-api';
import { PageHeader } from '@/components/fintech-ui';
import {
  AppIcon,
  AvatarImage,
  Button,
  Card,
  FormField,
  NoticeCard,
  Pill,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
  StatusIndicator,
  SummaryRow,
} from '@/components/ui';
import { useFocusRefresh } from '@/modules/navigation/focus-refresh';
import { useSession } from '@/modules/session/session-context';
import { authService } from '@/services/auth-gateway';
import { mediaService } from '@/services/media-service';
import { notificationService } from '@/services/notification-service';
import {
  baseFontFamily,
  colors,
  formatBdt,
  radius,
  spacing,
  type,
} from '@/theme/tokens';

function maskNidValue(nid?: string | null): string {
  if (!nid) return 'Not provided';
  const clean = nid.trim();
  if (clean.length <= 4) return '••••';
  const visibleTail = clean.slice(-4);
  return `${'•'.repeat(Math.min(9, clean.length - 4))}${visibleTail}`;
}

export default function SettingsScreen(): React.JSX.Element {
  const { status, user, signOut, signOutEverywhere, isAdmin, refresh } = useSession();
  const [busy, setBusy] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [nidVisible, setNidVisible] = React.useState(false);

  const [banner, setBanner] = React.useState<{
    tone: 'success' | 'danger';
    title: string;
    message: string;
  } | null>(null);

  // PIN form state & inline field errors
  const [currentPin, setCurrentPin] = React.useState('');
  const [newPin, setNewPin] = React.useState('');
  const [pinFieldErrors, setPinFieldErrors] = React.useState<{ current?: string; next?: string }>({});
  const [pinBusy, setPinBusy] = React.useState(false);

  // Password form state & inline field errors
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [passFieldErrors, setPassFieldErrors] = React.useState<{ current?: string; next?: string }>({});
  const [passBusy, setPassBusy] = React.useState(false);

  useFocusRefresh();
  const unread = status === 'signedIn' && user ? notificationService.unreadCount(user.id) : 0;

  const handleAvatarChange = async (): Promise<void> => {
    if (!user) return;
    setBanner(null);
    const picked = await mediaService.pickImage('avatars');
    if (picked.status === 'cancelled') return;
    if (picked.status === 'unavailable') {
      setBanner({ tone: 'danger', title: 'Photo access unavailable', message: picked.message });
      return;
    }

    setUploadingAvatar(true);
    try {
      await vantaApi.uploadAvatar(picked.uri, { authenticated: true });
      await refresh();
      setBanner({
        tone: 'success',
        title: 'Profile photo updated',
        message: 'আপনার প্রোফাইল ছবি সফলভাবে আপডেট হয়েছে।',
      });
    } catch (error) {
      setBanner({
        tone: 'danger',
        title: 'Photo upload failed',
        message: error instanceof Error ? error.message : 'Could not upload avatar.',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePin = async (): Promise<void> => {
    setBanner(null);
    const errors: { current?: string; next?: string } = {};
    if (!/^\d{4}$/.test(currentPin.trim())) {
      errors.current = 'Enter your current 4-digit PIN.';
    }
    if (!/^\d{4}$/.test(newPin.trim())) {
      errors.next = 'Enter a new 4-digit numeric PIN.';
    }
    setPinFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPinBusy(true);
    try {
      await authService.changePin(currentPin.trim(), newPin.trim());
      setCurrentPin('');
      setNewPin('');
      setPinFieldErrors({});
      setBanner({
        tone: 'success',
        title: 'PIN updated',
        message: 'আপনার ৪-ডিজিট সিকিউরিটি পিন সফলভাবে আপডেট করা হয়েছে।',
      });
    } catch (error) {
      setBanner({
        tone: 'danger',
        title: 'Could not update PIN',
        message: error instanceof Error ? error.message : 'Unable to change PIN.',
      });
    } finally {
      setPinBusy(false);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    if (!user) return;
    setBanner(null);
    const errors: { current?: string; next?: string } = {};
    if (!currentPassword) {
      errors.current = 'Enter your current password.';
    }
    if (newPassword.length < 6) {
      errors.next = 'New password must be at least 6 characters.';
    }
    setPassFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPassBusy(true);
    try {
      await authService.changePassword(user.id, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPassFieldErrors({});
      setBanner({
        tone: 'success',
        title: 'Password updated',
        message: 'আপনার অ্যাকাউন্ট পাসওয়ার্ড আপডেট হয়েছে।',
      });
    } catch (error) {
      setBanner({
        tone: 'danger',
        title: 'Could not update password',
        message: error instanceof Error ? error.message : 'Unable to change password.',
      });
    } finally {
      setPassBusy(false);
    }
  };

  const onSignOut = async (): Promise<void> => {
    if (!user) return;
    setBusy(true);
    setBanner(null);
    try {
      await signOut(user.id);
      router.replace('/login');
    } catch (error) {
      setBanner({
        tone: 'danger',
        title: 'Sign out failed',
        message: error instanceof Error ? error.message : 'We could not sign you out.',
      });
    } finally {
      setBusy(false);
    }
  };

  const onSignOutEverywhere = async (): Promise<void> => {
    if (!user) return;
    setBusy(true);
    setBanner(null);
    try {
      await signOutEverywhere(user.id);
      router.replace('/login');
    } catch (error) {
      setBanner({
        tone: 'danger',
        title: 'Sign out failed',
        message: error instanceof Error ? error.message : 'We could not sign you out everywhere.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padded>
      <PageHeader
        eyebrow="Account & security"
        title="Profile"
        subtitle="প্রোফাইল তথ্য, নিরাপত্তা পিন এবং অ্যাকাউন্ট সেটিংস"
      />

      {banner ? (
        <NoticeCard
          tone={banner.tone}
          title={banner.title}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      ) : null}

      {status === 'signedIn' && user ? (
        <>
          {/* 1. Customer Identity & Profile Information */}
          <Card style={styles.identityCard}>
            <View style={styles.identityRow}>
              <AvatarImage
                uri={user.avatarUrl || user.avatar}
                name={user.name}
                size={58}
                cornerRadius={radius.pill}
              />
              <View style={styles.identityCopy}>
                <View style={styles.nameBadgeRow}>
                  <Text numberOfLines={1} style={styles.identityName}>
                    {user.name}
                  </Text>
                  <StatusIndicator status={isAdmin ? 'ADMIN' : 'VERIFIED'} />
                </View>
                <Text style={styles.identityPhone}>{user.phone}</Text>
                <Pressable
                  onPress={handleAvatarChange}
                  disabled={uploadingAvatar}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Change profile photo"
                  style={({ pressed }) => [styles.photoActionBtn, pressed && { opacity: 0.78 }]}
                >
                  <AppIcon name="camera" size={13} color={colors.primary} />
                  <Text style={styles.photoActionText}>
                    {uploadingAvatar ? 'Uploading photo...' : 'Change profile photo'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Card>

          {/* 2. Customer Account Details */}
          <View style={styles.sectionBlock}>
            <SectionHeader
              title="Account details"
              caption="কাস্টমার আইডি ও কেওয়াইসি তথ্য"
            />
            <Card padded={false} style={styles.rowsContainer}>
              <SummaryRow
                label="Customer ID"
                value={user.customerId || 'AP-100001'}
                tone="strong"
                showDivider
              />
              <SummaryRow
                label="Mobile number"
                value={user.phone}
                showDivider
              />
              <SummaryRow
                label="National ID (NID)"
                value={nidVisible ? user.nid || 'Not provided' : maskNidValue(user.nid)}
                actionLabel={user.nid ? (nidVisible ? 'Hide' : 'Show') : undefined}
                onAction={user.nid ? () => setNidVisible((prev) => !prev) : undefined}
                showDivider
              />
              <SummaryRow
                label="Available balance"
                value={formatBdt(user.balance ?? 0, true)}
                tone="discount"
              />
            </Card>
          </View>

          {/* 3. In-App Notifications */}
          <View style={styles.sectionBlock}>
            <SectionHeader
              title="Notifications"
              caption="লেনদেন ও সিস্টেম নোটিফিকেশন"
            />
            <Pressable
              onPress={() => router.push('/notifications')}
              accessibilityRole="button"
              accessibilityLabel={`Open notifications, ${unread} unread`}
              style={({ pressed }) => [styles.navRowCard, pressed && styles.navRowPressed]}
            >
              <View style={styles.navRowIcon}>
                <AppIcon name="bell" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.navRowTitle}>In-app notifications</Text>
                <Text style={styles.navRowSubtitle}>
                  {unread > 0
                    ? `${unread} unread update${unread === 1 ? '' : 's'} waiting`
                    : 'View transaction and settlement alerts'}
                </Text>
              </View>
              {unread > 0 ? <Pill label={`${unread} new`} tone="info" /> : null}
              <AppIcon name="chevronRight" size={16} color={colors.textFaint} />
            </Pressable>
          </View>

          {/* 4. Security & PIN Management */}
          <View style={styles.sectionBlock}>
            <SectionHeader
              title="Security & PIN"
              caption="ফ্লেক্সিলোড ও অফার কেনার ৪-ডিজিট পিন পরিবর্তন"
            />
            <Card>
              <FormField
                label="Current 4-digit PIN · বর্তমান পিন"
                placeholder="••••"
                keyboardType="number-pad"
                maxLength={4}
                secure
                value={currentPin}
                onChangeText={(v) => {
                  setCurrentPin(v.replace(/\D/g, '').slice(0, 4));
                  if (pinFieldErrors.current) setPinFieldErrors((p) => ({ ...p, current: undefined }));
                }}
                error={pinFieldErrors.current}
              />
              <FormField
                label="New 4-digit PIN · নতুন পিন"
                placeholder="••••"
                keyboardType="number-pad"
                maxLength={4}
                secure
                value={newPin}
                onChangeText={(v) => {
                  setNewPin(v.replace(/\D/g, '').slice(0, 4));
                  if (pinFieldErrors.next) setPinFieldErrors((p) => ({ ...p, next: undefined }));
                }}
                error={pinFieldErrors.next}
                hint="Used to authorize Flexiload and bundle purchases"
              />
              <PrimaryButton
                title="Update PIN"
                icon="lock"
                onPress={handleChangePin}
                loading={pinBusy}
                fullWidth
              />
            </Card>
          </View>

          {/* 5. Password Management */}
          <View style={styles.sectionBlock}>
            <SectionHeader
              title="Password"
              caption="অ্যাকাউন্ট পাসওয়ার্ড পরিবর্তন"
            />
            <Card>
              <FormField
                label="Current password · বর্তমান পাসওয়ার্ড"
                placeholder="Enter current password"
                secure
                value={currentPassword}
                onChangeText={(v) => {
                  setCurrentPassword(v);
                  if (passFieldErrors.current) setPassFieldErrors((p) => ({ ...p, current: undefined }));
                }}
                error={passFieldErrors.current}
              />
              <FormField
                label="New password · নতুন পাসওয়ার্ড"
                placeholder="Minimum 6 characters"
                secure
                value={newPassword}
                onChangeText={(v) => {
                  setNewPassword(v);
                  if (passFieldErrors.next) setPassFieldErrors((p) => ({ ...p, next: undefined }));
                }}
                error={passFieldErrors.next}
                hint="At least 6 characters"
              />
              <SecondaryButton
                title="Update password"
                icon="key"
                onPress={handleChangePassword}
                loading={passBusy}
                fullWidth
              />
            </Card>
          </View>

          {/* 6. Session & Sign Out */}
          <View style={styles.sectionBlock}>
            <SectionHeader
              title="Session & access"
              caption="ডিভাইস সেশন ও লগআউট"
            />
            <Card style={{ gap: 10 }}>
              <SecondaryButton
                title="Sign out from all devices"
                onPress={onSignOutEverywhere}
                loading={busy}
                fullWidth
              />
              <Button
                title="Sign out"
                variant="danger"
                icon="logout"
                onPress={onSignOut}
                loading={busy}
                fullWidth
              />
            </Card>
          </View>
        </>
      ) : (
        <Card>
          <Text style={{ ...type.bodyMuted, marginBottom: spacing.md }}>
            Sign in to view your account details and security settings.
          </Text>
          <PrimaryButton title="Sign in" onPress={() => router.push('/login')} fullWidth />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    marginBottom: 4,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  identityName: {
    fontFamily: baseFontFamily,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.text,
  },
  identityPhone: {
    fontFamily: baseFontFamily,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 3,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.xs,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  photoActionText: {
    fontFamily: baseFontFamily,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },

  sectionBlock: {
    marginTop: 22,
  },
  rowsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },

  navRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navRowPressed: {
    backgroundColor: '#142238',
    borderColor: colors.primaryBorder,
  },
  navRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRowTitle: {
    fontFamily: baseFontFamily,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: colors.text,
  },
  navRowSubtitle: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
});
