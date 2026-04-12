import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Splash } from './src/components/Splash';
import { useAuthStore } from './src/store/authStore';
import { useFriendsStore } from './src/store/friendsStore';

export default function App() {
  const { loadStoredAuth, isLoading, isAuthenticated, user, avatarReady } = useAuthStore();
  const fetchFriends = useFriendsStore((s) => s.fetchFriends);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFriends();
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
            <NavigationContainer>
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
