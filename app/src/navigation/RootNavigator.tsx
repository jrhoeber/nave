import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { ParishSetupScreen } from '../screens/auth/ParishSetupScreen';
import { PostDetailScreen } from '../screens/shared/PostDetailScreen';
import { UserProfileScreen } from '../screens/shared/UserProfileScreen';
import { GroupMessageScreen } from '../screens/group/GroupMessageScreen';
import { GroupProfileScreen } from '../screens/group/GroupProfileScreen';
import { ComposeScreen } from '../screens/shared/ComposeScreen';
import { CreateGroupScreen } from '../screens/group/CreateGroupScreen';
import { BlockedUsersScreen } from '../screens/profile/BlockedUsersScreen';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, user } = useAuthStore((s) => ({ isAuthenticated: s.isAuthenticated, user: s.user }));

  const needsProfileSetup = isAuthenticated && !user?.birthday;
  const needsParishSetup = isAuthenticated && !!user?.birthday && !user?.parishId;
  const isReady = isAuthenticated && !!user?.birthday && !!user?.parishId;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : needsProfileSetup ? (
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      ) : needsParishSetup ? (
        <Stack.Screen name="ParishSetup" component={ParishSetupScreen} />
      ) : (
        <>
          <Stack.Screen name="App" component={AppNavigator} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="GroupMessage"
            component={GroupMessageScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="GroupProfile"
            component={GroupProfileScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen name="Compose" component={ComposeScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ animation: 'slide_from_right' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
