/**
 * Push notification setup using @react-native-firebase/messaging (v22 modular API).
 *
 * Setup required (one-time, per platform):
 *   npm install @react-native-firebase/app @react-native-firebase/messaging
 *   iOS:  add GoogleService-Info.plist + update AppDelegate.swift
 *   Android: add google-services.json + update build.gradle files
 *
 * See https://rnfirebase.io/ for full setup instructions.
 */

import { Platform } from 'react-native';
import { api, mapGroupMessage } from './apiClient';
import { useGroupChatStore } from '../store/groupChatStore';
import { usePrayerStore } from '../store/prayerStore';

// Lazy import so the app doesn't crash if Firebase isn't configured yet
async function getModules() {
  const [{ getApp }, messagingModule] = await Promise.all([
    import('@react-native-firebase/app'),
    import('@react-native-firebase/messaging'),
  ]);
  const {
    getMessaging,
    getToken,
    getAPNSToken,
    requestPermission,
    onMessage,
    onNotificationOpenedApp,
    getInitialNotification,
    onTokenRefresh,
    AuthorizationStatus,
  } = messagingModule;
  const messagingInstance = getMessaging(getApp());
  return {
    messagingInstance,
    getToken,
    getAPNSToken,
    requestPermission,
    onMessage,
    onNotificationOpenedApp,
    getInitialNotification,
    onTokenRefresh,
    AuthorizationStatus,
  };
}

let _currentToken: string | null = null;

/**
 * Request notification permissions, get the FCM token, and register it
 * with the Nave API. Call this after the user is authenticated.
 */
export async function registerPushToken(): Promise<void> {
  try {
    const {
      messagingInstance,
      getToken,
      getAPNSToken,
      requestPermission,
      onTokenRefresh,
      AuthorizationStatus,
    } = await getModules();

    const authStatus = await requestPermission(messagingInstance);
    console.log('[Push] permission status:', authStatus);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[Push] permission not granted, skipping token registration');
      return;
    }

    // On iOS, the APNs token may not be ready immediately after launch.
    // Poll until it's available before requesting the FCM token.
    if (Platform.OS === 'ios') {
      let apnsToken: string | null = null;
      for (let i = 0; i < 10; i++) {
        apnsToken = await getAPNSToken(messagingInstance);
        if (apnsToken) break;
        await new Promise(res => setTimeout(res, 1000));
      }
      if (!apnsToken) {
        console.log('[Push] APNs token not available after 10s, skipping');
        return;
      }
      console.log('[Push] APNs token ready');
    }

    const token = await getToken(messagingInstance);
    console.log('[Push] FCM token:', token ? token.slice(0, 20) + '...' : 'null');
    if (!token) return;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await api.registerDeviceToken(token, platform);
    console.log('[Push] token registered with API');
    _currentToken = token;

    // Handle token refresh
    onTokenRefresh(messagingInstance, async (newToken) => {
      try {
        await api.registerDeviceToken(newToken, platform);
        _currentToken = newToken;
      } catch {
        // Silently ignore
      }
    });
  } catch (err) {
    console.log('[Push] registerPushToken error:', err);
  }
}

/**
 * Unregister the current device token from the API.
 * Call this when the user logs out.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!_currentToken) return;
  try {
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await api.unregisterDeviceToken(_currentToken, platform);
    _currentToken = null;
  } catch {
    // Silently ignore
  }
}

type NavigateToGroup = (groupId: string) => void;
type NavigateToFriends = () => void;

/**
 * Set up handlers for notification taps.
 *
 * - Foreground: app is open — navigate immediately.
 * - Background tap: user tapped a notification while app was backgrounded.
 * - Cold start: user tapped a notification that launched the app from closed state.
 *
 * Call this once from NavigationContainer.onReady (after navigation is ready).
 */
export async function setupNotificationHandlers(
  navigateToGroup: NavigateToGroup,
  navigateToFriends: NavigateToFriends,
): Promise<void> {
  try {
    const { messagingInstance, onNotificationOpenedApp, getInitialNotification, onMessage } =
      await getModules();

    const handleMessage = (remoteMessage: any) => {
      const data = remoteMessage?.data;
      if (!data) return;
      if (data.type === 'group_message' && data.groupId) {
        navigateToGroup(data.groupId);
      } else if (data.type === 'friend_request') {
        navigateToFriends();
      }
    };

    // App in foreground — poll the affected group for new messages immediately
    onMessage(messagingInstance, async (remoteMessage) => {
      const data = remoteMessage?.data;
      if (data?.type !== 'group_message' || !data.groupId) return;
      const { mutedGroupIds } = usePrayerStore.getState();
      if (mutedGroupIds.has(data.groupId)) return;
      const { messagesByGroup, appendNewMessages } = useGroupChatStore.getState();
      const messages = messagesByGroup[data.groupId];
      if (!messages?.length) return;
      try {
        const result = await api.getGroupMessages(data.groupId, undefined, 20, messages[0].createdAt);
        if (result.messages.length > 0) {
          appendNewMessages(data.groupId, result.messages.map(mapGroupMessage));
        }
      } catch {}
    });

    // App backgrounded — user tapped notification
    onNotificationOpenedApp(messagingInstance, handleMessage);

    // App was closed — check if launched from a notification tap
    const initialMessage = await getInitialNotification(messagingInstance);
    if (initialMessage) {
      // Small delay to let navigation stack initialize
      setTimeout(() => handleMessage(initialMessage), 300);
    }
  } catch {
    // Firebase not configured — silently skip
  }
}
