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
import { AvatarImage, Button, Card, Field, Logo, NoticeCard, Screen } from '@/components/ui';
import { useSession } from '@/modules/session/session-context';
import {
  authRedirectTarget,
  hasAuthRedirectTarget,
  resumeAfterAuth,
} from '@/modules/session/route-guard';
import { mediaService } from '@/services/media-service';
import { colors, radius, spacing, type } from '@/theme/tokens';

const BD_PHONE_RE = /^01[3-9]\d{8}$/;
const NID_RE = /^(\d{10}|\d{13}|\d{17})$/;
const PIN_RE = /^\d{4}$/;

function AuthResumeGate(): React.JSX.Element {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Returning to your screen" />
    </View>
  );
}

export function UnifiedAuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }): React.JSX.Element {
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

  const fillDemoCustomer = React.useCallback(() => {
    setMode('login');
    setLoginPhone('01700000000');
    setLoginPassword('123456');
    setFieldError({});
    setFormError(null);
  }, []);

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
      // Fallback to local URI if offline or Cloudinary not configured
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
      errs.loginPhone = 'মোবাইল নম্বর দিন • Mobile number is required.';
    } else if (!BD_PHONE_RE.test(cleanPhone) && !cleanPhone.includes('@')) {
      errs.loginPhone = 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX)';
    }
    if (!loginPassword) {
      errs.loginPassword = 'পাসওয়ার্ড দিন • Password is required.';
    } else if (loginPassword.length < 6) {
      errs.loginPassword = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
    }

    setFieldError(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await signIn(cleanPhone, loginPassword);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in. Try again.');
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
      errs.name = 'আপনার পূর্ণ নাম লিখুন (২-৬০ অক্ষর) • Enter your full name.';
    }
    if (!NID_RE.test(cleanNid)) {
      errs.nid = 'সঠিক ১০, ১৩ অথবা ১৭ ডিজিটের NID নম্বর দিন • Valid 10/13/17-digit NID required.';
    }
    if (!BD_PHONE_RE.test(cleanPhone)) {
      errs.phone = 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX)';
    }
    if (password.length < 6) {
      errs.password = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে • At least 6 characters.';
    }
    if (confirmPassword !== password) {
      errs.confirmPassword = 'পাসওয়ার্ড দুটি মিলছে না • Passwords do not match.';
    }
    if (!PIN_RE.test(cleanPin)) {
      errs.pin = '৪ ডিজিটের গোপন পিন দিন • Enter a 4-digit numeric PIN.';
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
      setFormError(error instanceof Error ? error.message : 'Unable to create account.');
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
        <Logo size={58} />
        <Text style={styles.subtitle}>
          বাংলাদেশের দ্রুততম ফ্লেক্সিলোড, ইন্টারনেট বান্ডেল এবং ডিজিটাল ওয়ালেট প্ল্যাটফর্ম
        </Text>
      </View>

      {/* Segmented Mode Switch */}
      <View style={styles.segmentContainer}>
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
            লগইন • Login
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
            রেজিস্ট্রেশন • Register
          </Text>
        </Pressable>
      </View>

      {formError ? (
        <NoticeCard
          tone="danger"
          title="Authentication Error"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      ) : null}

      {mode === 'login' ? (
        <Card style={styles.authCard}>
          <Text style={type.h2}>আপনার অ্যাকাউন্টে লগইন করুন</Text>
          <Text style={[type.caption, { marginTop: 2, marginBottom: spacing.md }]}>
            Sign in with your 11-digit BD mobile number and password
          </Text>

          <Field
            label="মোবাইল নম্বর • Mobile Number (11 Digits)"
            placeholder="017XXXXXXXX"
            keyboardType="phone-pad"
            maxLength={11}
            value={loginPhone}
            onChangeText={(v) => setLoginPhone(v.replace(/\s+/g, ''))}
            error={fieldError.loginPhone}
          />
          <Field
            label="পাসওয়ার্ড • Password"
            placeholder="••••••"
            secure
            value={loginPassword}
            onChangeText={setLoginPassword}
            error={fieldError.loginPassword}
            onSubmitEditing={submitLogin}
          />

          <Button
            title="লগইন করুন • Sign In"
            onPress={submitLogin}
            loading={submitting}
            fullWidth
          />

          {/* One-Tap Demo Customer Helper */}
          <View style={styles.demoCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.demoTitle}>⚡ ডেমো কাস্টমার অ্যাকাউন্ট (Demo Account)</Text>
              <Text style={styles.demoMeta}>Phone: 01700000000 • Pass: 123456 • PIN: 1234</Text>
              <Text style={styles.demoMeta}>Starting Balance: ৳5,450 • ID: AP-100001</Text>
            </View>
            <Pressable
              onPress={fillDemoCustomer}
              accessibilityRole="button"
              accessibilityLabel="Fill demo customer credentials"
              style={({ pressed }) => [styles.demoFillBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.demoFillBtnText}>Auto Fill</Text>
            </Pressable>
          </View>
        </Card>
      ) : (
        <Card style={styles.authCard}>
          <Text style={type.h2}>নতুন অল পে বিডি অ্যাকাউন্ট খুলুন</Text>
          <Text style={[type.caption, { marginTop: 2, marginBottom: spacing.md }]}>
            Complete your KYC registration with NID & 4-digit security PIN
          </Text>

          {/* Optional Profile Picture Upload */}
          <View style={styles.avatarUploadRow}>
            <AvatarImage uri={avatarUrl || 'p:👤:allpay'} size={60} cornerRadius={radius.pill} />
            <View style={{ flex: 1 }}>
              <Text style={type.label}>প্রোফাইল ছবি • Profile Photo (Optional)</Text>
              <Text style={type.caption}>Cloudinary secure avatar upload</Text>
              <Pressable
                onPress={handlePickAvatar}
                disabled={uploadingAvatar}
                style={styles.uploadChip}
              >
                <Text style={styles.uploadChipText}>
                  {uploadingAvatar ? 'আপলোড হচ্ছে...' : avatarUrl ? '✓ ছবি পরিবর্তন করুন' : '+ ছবি নির্বাচন করুন'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Field
            label="পূর্ণ নাম • Full Name (নাম)"
            placeholder="আপনার পূর্ণ নাম লিখুন"
            value={name}
            onChangeText={setName}
            error={fieldError.name}
          />
          <Field
            label="জাতীয় পরিচয়পত্র নম্বর • NID Number (10/13/17 Digits)"
            placeholder="1995123456789"
            keyboardType="number-pad"
            maxLength={17}
            value={nid}
            onChangeText={(v) => setNid(v.replace(/\D/g, ''))}
            error={fieldError.nid}
            hint="১০, ১৩ অথবা ১৭ ডিজিটের এনআইডি নম্বর"
          />
          <Field
            label="মোবাইল নম্বর • Mobile Number (11 Digits)"
            placeholder="017XXXXXXXX"
            keyboardType="phone-pad"
            maxLength={11}
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
            error={fieldError.phone}
          />
          <Field
            label="পাসওয়ার্ড • Password"
            placeholder="কমপক্ষে ৬ অক্ষর"
            secure
            value={password}
            onChangeText={setPassword}
            error={fieldError.password}
          />
          <Field
            label="পাসওয়ার্ড নিশ্চিত করুন • Confirm Password"
            placeholder="পুনরায় পাসওয়ার্ড দিন"
            secure
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={fieldError.confirmPassword}
          />
          <Field
            label="৪-ডিজিট গোপন পিন • 4-Digit Security PIN (গোপন পিন)"
            placeholder="•••• (যেমন: 1234)"
            keyboardType="number-pad"
            maxLength={4}
            secure
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
            error={fieldError.pin}
            hint="ফ্লেক্সিলোড ও অফার কেনার সময় এই ৪ ডিজিট পিন প্রয়োজন হবে"
          />

          <Button
            title="রেজিস্ট্রেশন সম্পন্ন করুন • Create Account"
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
  brandHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  segmentLabelActive: {
    color: colors.textInverse,
  },
  authCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  demoCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  demoTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  demoMeta: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  demoFillBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  demoFillBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textInverse,
  },
  avatarUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  uploadChip: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(20, 184, 166, 0.16)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  uploadChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
});
