import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { SessionProvider } from '@/modules/session/session-context';
import { useBootGate } from '@/infrastructure/bootstrap';
import { Button, Card } from '@/components/ui';
import { GlobalProgressLine } from '@/components/global-progress-line';
import { spacing, colors, type } from '@/theme/tokens';

export default function RootLayout(): React.JSX.Element {
  const boot = useBootGate();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SessionProvider>
          <View style={styles.outerBackdrop}>
            <View style={[styles.mobileShell, Platform.OS === 'web' && styles.webMobileShell]}>
              <StatusBar style="light" />
              {boot.status === 'loading' ? (
                <View style={styles.centered}>
                  <ActivityIndicator
                    size="large"
                    color={colors.primary}
                    accessibilityLabel="Starting application"
                  />
                </View>
              ) : null}
              {boot.status === 'ready' ? <Stack screenOptions={{ headerShown: false }} /> : null}
              <GlobalProgressLine />
              {boot.status === 'failed' ? (
                <View style={styles.centered}>
                  <Card style={{ width: '100%', maxWidth: 400 }}>
                    <Text style={{ ...type.h3, marginBottom: spacing.sm }}>Application could not start</Text>
                    <Text style={{ ...type.bodyMuted, marginBottom: spacing.lg }}>{boot.error.message}</Text>
                    <Button title="Try again" fullWidth onPress={boot.retry} />
                  </Card>
                </View>
              ) : null}
            </View>
          </View>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  outerBackdrop: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileShell: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  webMobileShell: {
    maxWidth: 430,
    alignSelf: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
