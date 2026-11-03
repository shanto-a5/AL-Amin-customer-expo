import * as React from 'react';
import { Text, View } from 'react-native';

import { FormField, NoticeCard, PrimaryButton } from '@/components/ui';
import { authService } from '@/services/auth-gateway';
import { colors, spacing, type } from '@/theme/tokens';

export interface ResetConfirmProps {
  initialToken?: string;
  onDone: () => void;
  heading: string;
  subheading: string;
}

export function ResetConfirm({
  initialToken = '',
  onDone,
  heading,
  subheading,
}: ResetConfirmProps): React.JSX.Element {
  const [token, setToken] = React.useState(initialToken);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = React.useCallback(async () => {
    setFormError(null);
    if (!token.trim()) return setFormError('Paste the token from your reset email.');
    if (newPassword.length < 8) return setFormError('New password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return setFormError('The two passwords do not match.');
    setSubmitting(true);
    try {
      await authService.confirmPasswordReset(token.trim(), newPassword);
      onDone();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to reset your password.');
    } finally {
      setSubmitting(false);
    }
  }, [token, newPassword, confirmPassword, onDone]);

  return (
    <View>
      <Text style={type.h3}>{heading}</Text>
      <Text style={{ ...type.caption, color: colors.textMuted, marginTop: 3, marginBottom: spacing.md }}>
        {subheading}
      </Text>
      {formError ? (
        <NoticeCard tone="danger" title="Check reset details" message={formError} />
      ) : null}
      {initialToken ? null : (
        <FormField
          label="Reset token"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          placeholder="Paste recovery token"
        />
      )}
      <FormField
        label="New password"
        secure
        value={newPassword}
        onChangeText={setNewPassword}
        hint="At least 8 characters"
      />
      <FormField
        label="Confirm new password"
        secure
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <PrimaryButton title="Reset password" onPress={submit} loading={submitting} fullWidth />
    </View>
  );
}
