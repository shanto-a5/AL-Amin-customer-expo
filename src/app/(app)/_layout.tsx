import { Stack } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { SellerBottomDock } from '@/components/seller-bottom-dock';
import { CustomerDockClearanceProvider } from '@/components/customer-dock-inset';
import { ROUTE_GROUP_ANCHORS, vantaStackScreenOptions } from '@/modules/navigation/stack-options';

export const unstable_settings = { anchor: ROUTE_GROUP_ANCHORS.app };

export default function AppLayout(): React.JSX.Element {
  return (
    <CustomerDockClearanceProvider>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={vantaStackScreenOptions}>
          <Stack.Screen name="home" />
          <Stack.Screen name="offers" />
          <Stack.Screen name="transactions" />
          <Stack.Screen name="add-money" />
          <Stack.Screen name="operator/[operatorCode]" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="settings" />
        </Stack>
        <SellerBottomDock />
      </View>
    </CustomerDockClearanceProvider>
  );
}
