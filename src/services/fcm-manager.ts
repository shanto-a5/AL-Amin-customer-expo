import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Messaging, RemoteMessage } from '@react-native-firebase/messaging';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

import { vantaApi } from '@/api/vanta-api';
import type { User } from '@/domain/types';
import { notificationService } from '@/services/notification-service';

const FCM_FID_STORAGE_KEY = '@allpay_fcm_fid';
const APP_PACKAGE = 'com.allpaybd.app';
const APP_TYPE = 'customer';

let messagingInstance: Messaging | null = null;
let isInitialized = false;
let currentRegisteredFid: string | null = null;
let currentUser: User | null = null;

// Safe lazy import of @react-native-firebase/messaging to guard against web or environments without native modules
/**
 * Native Firebase cannot run in Expo Go (StoreClient) or on web: requiring
 * @react-native-firebase/app registers a TurboModule at evaluation time and
 * throws "Native module NativeRNFBTurboApp is not registered". This check must
 * run BEFORE any require() of the Firebase packages.
 */
function isNativeFirebaseSupported(): boolean {
  if (Platform.OS === 'web') return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  if (Constants.appOwnership === 'expo') return false;
  return true;
}

function getMessagingInstance(): Messaging | null {
  if (!isNativeFirebaseSupported()) return null;
  if (!messagingInstance) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@react-native-firebase/messaging');
      if (typeof mod.getMessaging === 'function') {
        messagingInstance = mod.getMessaging();
      } else if (typeof mod.default === 'function') {
        messagingInstance = mod.default();
      } else if (typeof mod === 'function') {
        messagingInstance = mod();
      }
    } catch (err) {
      console.warn('[FCM] Native messaging module not available:', err);
      return null;
    }
  }
  return messagingInstance;
}

// Register background message handler at top-level module evaluation
const messaging = getMessagingInstance();
if (messaging) {
  try {
    messaging.setBackgroundMessageHandler(async (remoteMessage: RemoteMessage) => {
      console.log('[FCM] Background message received:', remoteMessage.messageId);
    });
  } catch (err) {
    console.warn('[FCM] Failed to set background message handler:', err);
  }
}

/**
 * Request notification permissions (including Android 13+ POST_NOTIFICATIONS).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNativeFirebaseSupported()) return false;

  try {
    if (Platform.OS === 'android') {
      const sdkInt = Platform.constants.Version;
      if (typeof sdkInt === 'number' && sdkInt >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'AllPay BD Notifications',
            message: 'Allow notifications for wallet top-ups, recharge receipts, and security alerts.',
            buttonPositive: 'Allow',
            buttonNegative: 'Not Now',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('[FCM] Android 13+ notification permission denied');
          return false;
        }
      }
    }

    const messagingInst = getMessagingInstance();
    if (!messagingInst) return false;

    const authStatus = await messagingInst.requestPermission();
    const enabled =
      authStatus === 1 || // AUTHORIZED
      authStatus === 2; // PROVISIONAL

    return enabled;
  } catch (error) {
    console.warn('[FCM] Permission request failed:', error);
    return false;
  }
}

/**
 * Transmit the current Firebase Installation ID (FID) to the backend.
 */
async function syncFidToBackend(fid: string, user: User | null): Promise<void> {
  if (!user || !fid) return;

  const previousFid = await AsyncStorage.getItem(FCM_FID_STORAGE_KEY).catch(() => null);
  const deviceModel = `${Device.manufacturer || ''} ${Device.modelName || ''}`.trim();

  try {
    await vantaApi.registerFcm({
      fid,
      previousFid: previousFid !== fid ? previousFid : null,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appPackage: APP_PACKAGE,
      appType: APP_TYPE,
      deviceModel: deviceModel || 'Android Device',
    });
    await AsyncStorage.setItem(FCM_FID_STORAGE_KEY, fid);
    currentRegisteredFid = fid;
    console.log('[FCM] FID successfully synchronized with backend:', fid);
  } catch (error) {
    console.warn('[FCM] Failed to register FID with backend:', error);
  }
}

/**
 * Initialize FCM, FID registration, and message listeners for the customer app.
 */
export function initFcmManager(): () => void {
  if (isInitialized || !isNativeFirebaseSupported()) {
    return () => {};
  }

  const messagingInst = getMessagingInstance();
  if (!messagingInst) {
    return () => {};
  }

  isInitialized = true;
  const unsubscribers: (() => void)[] = [];

  void (async () => {
    // 1. Request OS notification permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('[FCM] Notification permissions not granted');
    }

    // 2. Listen for FID registration events (modern Firebase FID API)
    try {
      const unsubRegistered = messagingInst.onRegistered(async (fid: string) => {
        console.log('[FCM] onRegistered FID event received:', fid);
        currentRegisteredFid = fid;
        if (currentUser) {
          await syncFidToBackend(fid, currentUser);
        } else {
          await AsyncStorage.setItem(FCM_FID_STORAGE_KEY, fid);
        }
      });
      unsubscribers.push(unsubRegistered);

      // Trigger/ensure registration
      await messagingInst.register().catch((err: unknown) => {
        console.warn('[FCM] messaging.register() warning:', err);
      });
    } catch (err) {
      console.warn('[FCM] onRegistered listener failed to attach:', err);
    }

    // 3. Foreground message listener
    try {
      const unsubMessage = messagingInst.onMessage(async (remoteMessage: RemoteMessage) => {
        console.log('[FCM] Foreground notification received:', remoteMessage.notification?.title);
        if (currentUser) {
          notificationService.sync(currentUser.id, true);
        }

        const title = remoteMessage.notification?.title || 'AllPay BD';
        const body = remoteMessage.notification?.body || '';

        if (title && body) {
          Alert.alert(title, body, [
            { text: 'Dismiss', style: 'cancel' },
            {
              text: 'View',
              onPress: () => {
                router.push('/notifications');
              },
            },
          ]);
        }
      });
      unsubscribers.push(unsubMessage);
    } catch (err) {
      console.warn('[FCM] onMessage listener failed to attach:', err);
    }

    // 4. Background notification tap (app in background)
    try {
      const unsubOpened = messagingInst.onNotificationOpenedApp((remoteMessage: RemoteMessage) => {
        console.log('[FCM] App opened from background notification:', remoteMessage.data);
        if (currentUser) {
          notificationService.sync(currentUser.id, true);
        }
        router.push('/notifications');
      });
      unsubscribers.push(unsubOpened);
    } catch (err) {
      console.warn('[FCM] onNotificationOpenedApp listener failed to attach:', err);
    }

    // 5. Cold boot notification tap (app was quit)
    try {
      const initialMessage = await messagingInst.getInitialNotification();
      if (initialMessage) {
        console.log('[FCM] App launched from cold notification:', initialMessage.data);
        setTimeout(() => {
          router.push('/notifications');
        }, 600);
      }
    } catch (err) {
      console.warn('[FCM] getInitialNotification failed:', err);
    }
  })();

  return () => {
    unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // ignore
      }
    });
    isInitialized = false;
  };
}

/**
 * Inform the FCM manager of the currently authenticated user.
 */
export async function setFcmUser(user: User | null): Promise<void> {
  currentUser = user;
  if (!user) return;

  let fid = currentRegisteredFid;
  if (!fid) {
    fid = await AsyncStorage.getItem(FCM_FID_STORAGE_KEY).catch(() => null);
  }

  if (fid) {
    await syncFidToBackend(fid, user);
  }
}

/**
 * Handle unregistration on logout.
 */
export async function unregisterFcmOnLogout(): Promise<void> {
  const fid = currentRegisteredFid || (await AsyncStorage.getItem(FCM_FID_STORAGE_KEY).catch(() => null));
  currentUser = null;

  try {
    if (fid) {
      await vantaApi.unregisterFcm(fid).catch(() => null);
    }
    const messagingInst = getMessagingInstance();
    if (messagingInst) {
      await messagingInst.unregister().catch(() => null);
    }
  } catch (error) {
    console.warn('[FCM] Unregister on logout failed:', error);
  } finally {
    currentRegisteredFid = null;
    await AsyncStorage.removeItem(FCM_FID_STORAGE_KEY).catch(() => null);
  }
}
