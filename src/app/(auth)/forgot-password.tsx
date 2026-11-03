import { Redirect, router } from 'expo-router';
import * as React from 'react';
import { Text, View } from 'react-native';

import { PageHeader } from '@/components/fintech-ui';
import { Card, FormField, Logo, NoticeCard, PrimaryButton, Screen } from '@/components/ui';
import { ResetConfirm } from '@/modules/auth/reset-confirm';
import { useSession } from '@/modules/session/session-context';
import { authService } from '@/services/auth-gateway';
import { colors, spacing, type } from '@/theme/tokens';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen(): React.JSX.Element {
  const { status } = useSession();
  const [step, setStep] = React.useState<'email' | 'token' | 'success'>('email');
  const [email, setEmail] = React.useState('');
  const [localToken, setLocalToken] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const requestLink = React.useCallback(async () => {
    setFormError(null);
    if (!email.trim()) return setFormError('Enter your account email.');
    if (!EMAIL_RE.test(email.trim())) return setFormError('Enter a valid email address.');
    setSubmitting(true);
    try {
      const result = await authService.requestPasswordReset(email.trim());
      setLocalToken(result.localToken ?? null);
      setStep('token');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to send a reset link.');
    } finally {
      setSubmitting(false);
    }
  }, [email]);

  if (status === 'signedIn') return <Redirect href="/" />;

  return (
    <Screen padded>
      <View style={{ marginBottom: spacing.lg }}>
        <Logo size={46} />
      </View>

      <PageHeader
        backFallbackHref="/login"
        title={
          step === 'email'
            ? 'Forgot password'
            : step === 'token'
              ? 'Check your inbox'
              : 'Password updated'
        }
        subtitle={
          step === 'email'
            ? "Enter your email and we'll send a single-use reset link."
            : step === 'token'
              ? localToken
                ? 'Enter a new password below to complete recovery.'
                : `Paste the reset token sent to ${email.trim()}.`
              : 'Your password has been updated and other sessions have been signed out.'
        }
      />

      {step === 'email' ? (
        <Card>
          <FormField
            label="Email address"
            keyboardType="email-address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            error={formError}
          />
          <PrimaryButton
            title="Send reset link"
            onPress={requestLink}
            loading={submitting}
            fullWidth
          />
        </Card>
      ) : step === 'token' ? (
        <Card>
          {localToken ? (
            <NoticeCard
              tone="neutral"
              title="Preview reset token"
              message={`Local device token: ${localToken}`}
            />
          ) : null}
          <ResetConfirm
            heading="Choose a new password"
            subheading="Enter at least 8 characters."
            onDone={() => setStep('success')}
          />
        </Card>
      ) : (
        <Card>
          <Text style={{ ...type.bodyMuted, color: colors.textMuted, marginBottom: spacing.lg }}>
            You can now sign in with your updated password.
          </Text>
          <PrimaryButton title="Sign in" onPress={() => router.replace('/login')} fullWidth />
        </Card>
      )}
    </Screen>
  );
}
