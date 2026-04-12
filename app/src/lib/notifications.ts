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
import { api } from './apiClient';

// Lazy import so the app doesn't crash if Firebase isn't configured yet
async function getModules() {
  const [{ getApp }, messagingModule] = await Promise.all([
    import('@react-native-firebase/app'),
    import('@react-native-firebase/messaging'),
  ]);
  const {
    getMessaging,
    getToken,
    requestPermission,
    onNotificationOpenedApp,
    getInitialNotification,
    onTokenRefresh,
    AuthorizationStatus,
  } = messagingModule;
  const messagingInstance = getMessaging(getApp());
  return {
    messagingInstance,
    getToken,
    requestPermission,
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
      requestPermission,
      onTokenRefresh,
      AuthorizationStatus,
    } = await getModules();

    const authStatus = await requestPermission(messagingInstance);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) return;

    const token = await getToken(messagingInstance);
    if (!token) return;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await api.registerDeviceToken(token, platform);
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
  } catch {
    // Firebase not configured or permission denied — silently skip
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
    const { messagingInstance, onNotificationOpenedApp, getInitialNotification } =
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
