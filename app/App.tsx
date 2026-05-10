import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Splash } from './src/components/Splash';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAuthStore } from './src/store/authStore';
import { useFriendsStore } from './src/store/friendsStore';
import { registerPushToken, unregisterPushToken, setupNotificationHandlers } from './src/lib/notifications';
import type { RootStackParamList } from './src/types/navigation';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function App() {
  const { loadStoredAuth, isLoading, isAuthenticated } = useAuthStore();
  const fetchFriends = useFriendsStore((s) => s.fetchFriends);
  const [splashDone, setSplashDone] = useState(false);
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // Defer non-critical work so the initial render isn't competing with
      // friend-list and FCM I/O. requestIdleCallback yields when the JS thread
      // is idle; the timeout caps the delay so it always runs reasonably soon.
      const idle = (globalThis as any).requestIdleCallback as
        | ((cb: () => void, opts?: { timeout?: number }) => number)
        | undefined;
      const cancelIdle = (globalThis as any).cancelIdleCallback as
        | ((handle: number) => void)
        | undefined;
      const run = () => {
        fetchFriends();
        registerPushToken();
      };
      const handle = idle ? idle(run, { timeout: 1500 }) : (setTimeout(run, 0) as unknown as number);
      wasAuthenticatedRef.current = true;
      return () => (cancelIdle ? cancelIdle(handle) : clearTimeout(handle as unknown as ReturnType<typeof setTimeout>));
    } else if (wasAuthenticatedRef.current) {
      // Was authenticated, now logged out
      unregisterPushToken();
      wasAuthenticatedRef.current = false;
    }
  }, [isAuthenticated]);

  // Dismiss splash as soon as auth has finished loading. Avatar paints on its
  // own — Avatar's initials fallback covers any momentary blank during decode.
  useEffect(() => {
    if (!isLoading) setSplashDone(true);
  }, [isLoading]);

  return (
    <View style={styles.root}>
      {!isLoading && (
        <GestureHandlerRootView style={styles.root}>
          <SafeAreaProvider>
            <NavigationContainer
              ref={navigationRef}
              onReady={() => {
                setupNotificationHandlers(
                  (groupId) => {
                    if (navigationRef.isReady()) {
                      navigationRef.navigate('GroupMessage', { id: groupId });
                    }
                  },
                  () => {
                    // Navigate to App tab navigator and switch to Friends tab
                    if (navigationRef.isReady()) {
                      navigationRef.navigate('App' as any, { screen: 'Friends' } as any);
                    }
                  },
                  () => {
                    // Navigate to App tab navigator and switch to Groups tab
                    if (navigationRef.isReady()) {
                      navigationRef.navigate('App' as any, { screen: 'Groups' } as any);
                    }
                  },
                  (groupId) => {
                    if (navigationRef.isReady()) {
                      navigationRef.navigate('GroupProfile', { id: groupId });
                    }
                  },
                );
              }}
            >
              <ErrorBoundary>
                <RootNavigator />
              </ErrorBoundary>
            </NavigationContainer>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      )}
      <Splash visible={!splashDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
