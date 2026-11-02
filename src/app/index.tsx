import { Redirect } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/modules/session/session-context';
import { colors } from '@/theme/tokens';

export default function EntryGate(): React.JSX.Element {
  const { status } = useSession();

  if (status === 'checking') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Checking session" />
      </View>
    );
  }

  if (status === 'signedOut') {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/home" />;
}
