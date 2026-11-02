import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { vantaApi } from '@/api/vanta-api';
import {
  AvatarImage,
  Button,
  Card,
  Field,
  NoticeCard,
  Pill,
  Screen,
  SectionHeader,
  SummaryRow,
} from '@/components/ui';
import { useFocusRefresh } from '@/modules/navigation/focus-refresh';
import { useSession } from '@/modules/session/session-context';
import { authService } from '@/services/auth-gateway';
import { mediaService } from '@/services/media-service';
import { notificationService } from '@/services/notification-service';
import { colors, formatBdt, radius, spacing, type } from '@/theme/tokens';

export default function SettingsScreen(): React.JSX.Element {
  const { status, user, signOut, signOutEverywhere, isAdmin, refresh } = useSession();
  const [busy, setBusy] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [banner, setBanner] = React.useState<{ tone: 'success' | 'danger'; title: string; message: string } | null>(null);

  // Change PIN state
  const [currentPin, setCurrentPin] = React.useState('');
  const [newPin, setNewPin] = React.useState('');
  const [pinBusy, setPinBusy] = React.useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [passBusy, setPassBusy] = React.useState(false);

  useFocusRefresh();
  const unread = status === 'signedIn' && user ? notificationService.unreadCount(user.id) : 0;

  const handleAvatarChange = async (): Promise<void> => {
    if (!user) return;
    setBanner(null);
    const picked = await mediaService.pickImage('avatars');
    if (picked.status === 'cancelled') return;
    if (picked.status === 'unavailable') {
      setBanner({ tone: 'danger', title: 'Photo Access', message: picked.message });
      return;
    }

    setUploadingAvatar(true);
    try {
      await vantaApi.uploadAvatar(picked.uri, { authenticated: true });
      await refresh();
      setBanner({
        tone: 'success',
        title: 'প্রোফাইল ছবি আপডেট হয়েছে',
        message: 'Your Cloudinary profile picture has been updated.',
      });
    } catch (error) {
      setBanner({
        tone: 'danger',
        title: 'Avatar Upload Failed',
        message: error instanceof Error ? error.message : 'Could not upload avatar.',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePin = async (): Promise<void> => {
    setBanner(null);
    if (!/^\d{4}$/.test(currentPin.trim()) || !/^\d{4}$/.test(newPin.trim())) {
      setBanner({
        tone: 'danger',
        title: 'পিন যাচাই করুন',
        message: 'Current PIN and New PIN must both be 4-digit numbers.',
      });
      return;
    }

    setPinBusy(true);
    try {
      await authService.changePin(currentPin.trim(), newPin.trim());
      setCurrentPin('');
      setNewPin('');
      setBanner({
        tone: 'success',
        title: 'গোপন পিন পরিবর্তন সফল',
        message: 'আপনার ৪-ডিজিট সিকিউরিটি পিন সফলভাবে আপডেট করা হয়েছে।',
      });
    } catch (error) {
      setBanner({
        tone: 'danger',
        title: 'PIN Update Error',
        message: error instanceof Error ? error.message : 'Unable to change PIN.',
      });
    } finally {
      setPinBusy(false);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    if (!user) return;
    setBanner(null);
    if (!currentPassword || newPassword.length < 6) {
      setBanner({
        tone: 'danger',
        title: 'পাসওয়ার্ড যাচাই করুন',
        message: 'Current password and a new password (at least 6 characters) are required.',
      });
      return;
    }

    setPassBusy(true);
    try {
      await authService.changePassword(user.id, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setBanner({
        tone: 'success',
        title: 'পাসওয়ার্ড পরিবর্তন সফল',
        message: 'আপনার অ্যাকাউন্ট পাসওয়ার্ড আপডেট হয়েছে।',
      });
    } catch (error) {
      setBanner({
        tone: 'danger',
        title: 'Password Update Error',
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
      <Text style={type.h1}>প্রোফাইল ও নিরাপত্তা • Profile</Text>
      <Text style={[type.caption, { marginTop: 2, marginBottom: spacing.md }]}>
        AllPay BD KYC Identity, Cloudinary Avatar & Security PIN Settings
      </Text>

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
          <Card style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <AvatarImage
                uri={user.avatarUrl || user.avatar || `p:👤:${user.phone}`}
                size={68}
                cornerRadius={radius.pill}
              />
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={type.h2}>{user.name}</Text>
                  <Pill label={isAdmin ? 'ADMIN' : 'VERIFIED'} tone={isAdmin ? 'info' : 'success'} />
                </View>
                <Text style={[type.caption, { marginTop: 2 }]}>Customer ID: {user.customerId || 'AP-100001'}</Text>
                <Pressable
                  onPress={handleAvatarChange}
                  disabled={uploadingAvatar}
                  style={styles.uploadBtn}
                >
                  <Text style={styles.uploadBtnText}>
                    {uploadingAvatar ? 'আপলোড হচ্ছে...' : '📷 প্রোফাইল ছবি পরিবর্তন করুন (Cloudinary)'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.divider} />

            <SummaryRow label="কাস্টমার আইডি (Customer ID)" value={user.customerId || 'AP-100001'} tone="strong" />
            <SummaryRow label="মোবাইল নম্বর (Mobile)" value={user.phone} />
            <SummaryRow label="জাতীয় পরিচয়পত্র (NID)" value={user.nid || 'N/A'} />
            <SummaryRow label="বর্তমান ব্যালেন্স (Wallet Balance)" value={formatBdt(user.balance ?? 0, true)} tone="discount" />
          </Card>

          <SectionHeader title="নোটিফিকেশন • In-App Inbox" caption="Transaction & settlement alerts" />
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={styles.notifRow}>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>অ্যাকাউন্ট নোটিফিকেশন</Text>
                <Text style={type.caption}>
                  {unread > 0 ? `${unread} টি অপঠিত আপডেট রয়েছে` : 'সকল লেনদেন আপডেট দেখুন'}
                </Text>
              </View>
              <Button title={`Inbox (${unread})`} variant="secondary" onPress={() => router.push('/notifications')} />
            </View>
          </Card>

          {/* Change 4-Digit Security PIN */}
          <SectionHeader title="গোপন পিন পরিবর্তন • Change 4-Digit PIN" caption="Used for Flexiload & Offer purchases" />
          <Card style={{ marginBottom: spacing.lg }}>
            <Field
              label="বর্তমান ৪-ডিজিট পিন • Current PIN"
              placeholder="••••"
              keyboardType="number-pad"
              maxLength={4}
              secure
              value={currentPin}
              onChangeText={(v) => setCurrentPin(v.replace(/\D/g, '').slice(0, 4))}
            />
            <Field
              label="নতুন ৪-ডিজিট পিন • New 4-Digit PIN"
              placeholder="••••"
              keyboardType="number-pad"
              maxLength={4}
              secure
              value={newPin}
              onChangeText={(v) => setNewPin(v.replace(/\D/g, '').slice(0, 4))}
            />
            <Button title="পিন আপডেট করুন • Update PIN" onPress={handleChangePin} loading={pinBusy} fullWidth />
          </Card>

          {/* Change Password */}
          <SectionHeader title="পাসওয়ার্ড পরিবর্তন • Change Password" caption="Update your sign-in password" />
          <Card style={{ marginBottom: spacing.lg }}>
            <Field
              label="বর্তমান পাসওয়ার্ড • Current Password"
              placeholder="••••••"
              secure
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <Field
              label="নতুন পাসওয়ার্ড • New Password"
              placeholder="কমপক্ষে ৬ অক্ষর"
              secure
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <Button
              title="পাসওয়ার্ড আপডেট করুন • Update Password"
              variant="secondary"
              onPress={handleChangePassword}
              loading={passBusy}
              fullWidth
            />
          </Card>

          <SectionHeader title="সেশন ও লগআউট • Session Security" />
          <Card style={{ marginBottom: spacing.xl }}>
            <Button title="লগআউট করুন • Sign Out" variant="danger" onPress={onSignOut} loading={busy} fullWidth />
            <View style={{ height: spacing.sm }} />
            <Button
              title="সকল ডিভাইস থেকে লগআউট • Sign Out Everywhere"
              variant="secondary"
              onPress={onSignOutEverywhere}
              loading={busy}
              fullWidth
            />
          </Card>
        </>
      ) : (
        <Card>
          <Text style={{ ...type.body, color: colors.textMuted, marginBottom: spacing.md }}>
            আপনার প্রোফাইল দেখতে লগইন করুন।
          </Text>
          <Button title="লগইন করুন • Sign In" onPress={() => router.push('/login')} fullWidth />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    marginBottom: spacing.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  uploadBtn: {
    marginTop: spacing.xs + 2,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(20, 184, 166, 0.16)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  uploadBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
