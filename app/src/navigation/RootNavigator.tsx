import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { PostDetailScreen } from '../screens/shared/PostDetailScreen';
import { UserProfileScreen } from '../screens/shared/UserProfileScreen';
import { PrayerGroupDetailScreen } from '../screens/prayer/PrayerGroupDetailScreen';
import { ComposeScreen } from '../screens/shared/ComposeScreen';
import { CreatePrayerGroupScreen } from '../screens/prayer/CreatePrayerGroupScreen';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Stack.Screen name="App" component={AppNavigator} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="PrayerGroupDetail" component={PrayerGroupDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Compose" component={ComposeScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="CreatePrayerGroup" component={CreatePrayerGroupScreen} options={{ presentation: 'modal' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
