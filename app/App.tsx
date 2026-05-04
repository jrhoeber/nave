import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Splash } from './src/components/Splash';
import { useAuthStore } from './src/store/authStore';
import { useFriendsStore } from './src/store/friendsStore';
import { registerPushToken, unregisterPushToken, setupNotificationHandlers } from './src/lib/notifications';
import type { RootStackParamList } from './src/types/navigation';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function App() {
  const { loadStoredAuth, isLoading, isAuthenticated, user, avatarReady } = useAuthStore();
  const fetchFriends = useFriendsStore((s) => s.fetchFriends);
  const [splashDone, setSplashDone] = useState(false);
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFriends();
      registerPushToken();
      wasAuthenticatedRef.current = true;
    } else if (wasAuthenticatedRef.current) {
      // Was authenticated, now logged out
      unregisterPushToken();
      wasAuthenticatedRef.current = false;
    }
  }, [isAuthenticated]);

  // Dismiss splash when auth is loaded and either: not authenticated, no avatar, or avatar painted
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.avatarUrl || avatarReady)) {
      setSplashDone(true);
    }
  }, [isLoading, isAuthenticated, user?.avatarUrl, avatarReady]);

  // 3-second fallback — never hang if avatar is slow or broken
  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setSplashDone(true), 3000);
      return () => clearTimeout(t);
    }
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
              <RootNavigator />
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
