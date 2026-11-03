import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Text, View } from 'react-native';

import { PageHeader } from '@/components/fintech-ui';
import { Card, Logo, PrimaryButton, Screen } from '@/components/ui';
import { ResetConfirm } from '@/modules/auth/reset-confirm';
import { useSession } from '@/modules/session/session-context';
import { spacing, type } from '@/theme/tokens';

export default function ResetPasswordScreen(): React.JSX.Element {
  const { status } = useSession();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const raw = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = (raw ?? '').trim();
  const [done, setDone] = React.useState(false);

  if (status === 'signedIn') return <Redirect href="/" />;

  return (
    <Screen padded>
      <View style={{ marginBottom: spacing.lg }}>
        <Logo size={46} />
      </View>

      <PageHeader
        backFallbackHref="/login"
        title={done ? 'Password reset complete' : 'Reset password'}
        subtitle={
          done
            ? 'Your password has been updated.'
            : token
              ? 'This recovery link can only be used once.'
              : 'Paste the token from your recovery email.'
        }
      />

      <Card>
        {done ? (
          <>
            <Text style={{ ...type.bodyMuted, marginBottom: spacing.lg }}>
              Sign in with your new password to access your wallet.
            </Text>
            <PrimaryButton title="Sign in" onPress={() => router.replace('/login')} fullWidth />
          </>
        ) : (
          <ResetConfirm
            initialToken={token || undefined}
            heading="Choose a new password"
            subheading="Must be at least 8 characters."
            onDone={() => setDone(true)}
          />
        )}
      </Card>
    </Screen>
  );
}
