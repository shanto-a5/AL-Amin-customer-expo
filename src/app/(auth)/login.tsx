import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { vantaApi } from '@/api/vanta-api';
import {
  AppIcon,
  AvatarImage,
  Card,
  FormField,
  Logo,
  NoticeCard,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import {
  authRedirectTarget,
  hasAuthRedirectTarget,
  resumeAfterAuth,
} from '@/modules/session/route-guard';
import { useSession } from '@/modules/session/session-context';
import { describeAuthError } from '@/services/auth-error';
import { mediaService } from '@/services/media-service';
import { baseFontFamily, colors, radius, spacing, type } from '@/theme/tokens';

const BD_PHONE_RE = /^01[3-9]\d{8}$/;
const NID_RE = /^(\d{10}|\d{13}|\d{17})$/;
const PIN_RE = /^\d{4}$/;

function AuthResumeGate(): React.JSX.Element {
  return (
    <View style={styles.resumeGate}>
      <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Signing in" />
    </View>
  );
}

export function UnifiedAuthScreen({
  initialMode = 'login',
}: {
  initialMode?: 'login' | 'register';
}): React.JSX.Element {
  const { status, signIn, signUp } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string | string[]; mode?: string }>();
  const next = authRedirectTarget(params.next);

  const [mode, setMode] = React.useState<'login' | 'register'>(
    params.mode === 'register' ? 'register' : initialMode,
  );

  // Login fields
  const [loginPhone, setLoginPhone] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');

  // Registration fields
  const [name, setName] = React.useState('');
  const [nid, setNid] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

  const [fieldError, setFieldError] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handlePickAvatar = React.useCallback(async () => {
    setFormError(null);
    const pick = await mediaService.pickImage('avatars');
    if (pick.status === 'cancelled') return;
    if (pick.status === 'unavailable') {
      setFormError(pick.message);
      return;
    }

    setUploadingAvatar(true);
    try {
      const uploaded = await vantaApi.uploadAvatar(pick.uri, { authenticated: false });
      setAvatarUrl(uploaded.avatarUrl);
    } catch {
      setAvatarUrl(pick.uri);
    } finally {
      setUploadingAvatar(false);
    }
  }, []);

  const submitLogin = React.useCallback(async () => {
    setFormError(null);
    const errs: Record<string, string> = {};
    const cleanPhone = loginPhone.trim();

    if (!cleanPhone) {
      errs.loginPhone = 'মোবাইল নম্বর দিন · Mobile number is required.';
    } else if (!BD_PHONE_RE.test(cleanPhone) && !cleanPhone.includes('@')) {
      errs.loginPhone = 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX).';
    }
    if (!loginPassword) {
      errs.loginPassword = 'পাসওয়ার্ড দিন · Password is required.';
    } else if (loginPassword.length < 6) {
      errs.loginPassword = 'Password must be at least 6 characters.';
    }

    setFieldError(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await signIn(cleanPhone, loginPassword);
    } catch (error) {
      const { banner, fieldErrors } = describeAuthError(error, 'Unable to sign in. Try again.', {
        phone: 'loginPhone',
        email: 'loginPhone',
        identifier: 'loginPhone',
        password: 'loginPassword',
      });
      setFieldError(fieldErrors);
      setFormError(banner);
    } finally {
      setSubmitting(false);
    }
  }, [loginPhone, loginPassword, signIn]);

  const submitRegister = React.useCallback(async () => {
    setFormError(null);
    const errs: Record<string, string> = {};

    const cleanName = name.trim();
    const cleanNid = nid.trim();
    const cleanPhone = phone.trim();
    const cleanPin = pin.trim();

    if (cleanName.length < 2 || cleanName.length > 60) {
      errs.name = 'আপনার পূর্ণ নাম লিখুন · Enter your full name (2–60 chars).';
    }
    if (!NID_RE.test(cleanNid)) {
      errs.nid = 'Enter a valid 10, 13, or 17-digit NID number.';
    }
    if (!BD_PHONE_RE.test(cleanPhone)) {
      errs.phone = 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX).';
    }
    if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    if (confirmPassword !== password) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    if (!PIN_RE.test(cleanPin)) {
      errs.pin = 'Enter a 4-digit numeric security PIN.';
    }

    setFieldError(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await signUp({
        name: cleanName,
        nid: cleanNid,
        phone: cleanPhone,
        password,
        pin: cleanPin,
        avatarUrl: avatarUrl || undefined,
      });
    } catch (error) {
      const { banner, fieldErrors } = describeAuthError(error, 'Unable to create account.');
      setFieldError(fieldErrors);
      setFormError(banner);
    } finally {
      setSubmitting(false);
    }
  }, [name, nid, phone, password, confirmPassword, pin, avatarUrl, signUp]);

  const resume = status === 'signedIn' && hasAuthRedirectTarget(params.next);
  React.useEffect(() => {
    if (resume) resumeAfterAuth(router);
  }, [resume, router]);

  if (resume) return <AuthResumeGate />;
  if (status === 'signedIn') return <Redirect href={next} />;

  return (
    <Screen padded>
      <View style={styles.brandHeader}>
        <Logo size={46} />
        <Text style={styles.welcomeTitle}>
          {mode === 'login' ? 'Sign in to your wallet' : 'Create your AllPay account'}
        </Text>
        <Text style={styles.welcomeSubtitle}>
          {mode === 'login'
            ? 'মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে নিরাপদে লগইন করুন'
            : 'এনআইডি ও ৪-ডিজিট পিন দিয়ে নতুন ডিজিটাল ওয়ালেট খুলুন'}
        </Text>
      </View>

      {/* Segmented Mode Switch */}
      <View accessibilityRole="tablist" style={styles.segmentContainer}>
        <Pressable
          onPress={() => {
            setMode('login');
            setFieldError({});
            setFormError(null);
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'login' }}
          style={[styles.segmentBtn, mode === 'login' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentLabel, mode === 'login' && styles.segmentLabelActive]}>
            Sign in · লগইন
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setMode('register');
            setFieldError({});
            setFormError(null);
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'register' }}
          style={[styles.segmentBtn, mode === 'register' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentLabel, mode === 'register' && styles.segmentLabelActive]}>
            Register · নিবন্ধন
          </Text>
        </Pressable>
      </View>

      {formError ? (
        <NoticeCard
          tone="danger"
          title="Authentication error"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      ) : null}

      {mode === 'login' ? (
        <Card style={styles.authCard}>
          <FormField
            label="Mobile number · মোবাইল নম্বর"
            placeholder="017XXXXXXXX"
            keyboardType="phone-pad"
            maxLength={11}
            value={loginPhone}
            onChangeText={(v) => setLoginPhone(v.replace(/\s+/g, ''))}
            error={fieldError.loginPhone}
          />
          <FormField
            label="Password · পাসওয়ার্ড"
            placeholder="Enter your password"
            secure
            value={loginPassword}
            onChangeText={setLoginPassword}
            error={fieldError.loginPassword}
            onSubmitEditing={submitLogin}
          />

          <PrimaryButton
            title="Sign in"
            onPress={submitLogin}
            loading={submitting}
            fullWidth
          />
        </Card>
      ) : (
        <Card style={styles.authCard}>
          {/* Optional Profile Picture Upload */}
          <View style={styles.avatarUploadRow}>
            <AvatarImage
              uri={avatarUrl || null}
              name={name || null}
              size={54}
              cornerRadius={radius.pill}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={type.label}>Profile photo (optional)</Text>
              <Text style={[type.meta, { marginTop: 2 }]}>প্রোফাইল ছবি যুক্ত করুন</Text>
              <Pressable
                onPress={handlePickAvatar}
                disabled={uploadingAvatar}
                style={({ pressed }) => [styles.uploadChip, pressed && { opacity: 0.8 }]}
              >
                <AppIcon name="camera" size={13} color={colors.primary} />
                <Text style={styles.uploadChipText}>
                  {uploadingAvatar
                    ? 'Uploading...'
                    : avatarUrl
                      ? 'Change photo'
                      : 'Choose photo'}
                </Text>
              </Pressable>
            </View>
          </View>

          <FormField
            label="Full name · পূর্ণ নাম"
            placeholder="আপনার পূর্ণ নাম লিখুন"
            value={name}
            onChangeText={setName}
            error={fieldError.name}
          />
          <FormField
            label="National ID (NID) · জাতীয় পরিচয়পত্র"
            placeholder="1995123456789"
            keyboardType="number-pad"
            maxLength={17}
            value={nid}
            onChangeText={(v) => setNid(v.replace(/\D/g, ''))}
            error={fieldError.nid}
            hint="10, 13, or 17-digit NID number"
          />
          <FormField
            label="Mobile number · মোবাইল নম্বর"
            placeholder="017XXXXXXXX"
            keyboardType="phone-pad"
            maxLength={11}
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
            error={fieldError.phone}
          />
          <FormField
            label="Password · পাসওয়ার্ড"
            placeholder="Minimum 6 characters"
            secure
            value={password}
            onChangeText={setPassword}
            error={fieldError.password}
          />
          <FormField
            label="Confirm password · পাসওয়ার্ড নিশ্চিত করুন"
            placeholder="Re-enter password"
            secure
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={fieldError.confirmPassword}
          />
          <FormField
            label="4-digit PIN · গোপন পিন"
            placeholder="••••"
            keyboardType="number-pad"
            maxLength={4}
            secure
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
            error={fieldError.pin}
            hint="Used to authorize Flexiload and bundle purchases"
          />

          <PrimaryButton
            title="Create account"
            onPress={submitRegister}
            loading={submitting}
            fullWidth
          />
        </Card>
      )}
    </Screen>
  );
}

export default function LoginScreen(): React.JSX.Element {
  return <UnifiedAuthScreen initialMode="login" />;
}

const styles = StyleSheet.create({
  resumeGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  brandHeader: {
    marginTop: spacing.xs,
    marginBottom: 20,
  },
  welcomeTitle: {
    ...type.h1,
    marginTop: 20,
  },
  welcomeSubtitle: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: 6,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentLabel: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentLabelActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  authCard: {
    marginBottom: spacing.xl,
  },
  avatarUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  uploadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 7,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  uploadChipText: {
    fontFamily: baseFontFamily,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
});
