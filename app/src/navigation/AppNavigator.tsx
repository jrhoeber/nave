import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrayerScreen } from '../screens/prayer/PrayerScreen';
import { CommunityScreen } from '../screens/community/CommunityScreen';
import { FriendsScreen } from '../screens/friends/FriendsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { Avatar } from '../components/ui/Avatar';
import { useAuthStore } from '../store/authStore';
import { Colors, Typography } from '../theme';
import type { AppTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<AppTabParamList>();

function ProfileTabIcon({ color, size }: { color: string; size: number }) {
  const user = useAuthStore((s) => s.user);
  if (user?.avatarUrl) {
    return <Avatar uri={user.avatarUrl} name={user.displayName} size={size} />;
  }
  return <Icon name="person-outline" size={size} color={color} />;
}

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom || 0;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 48 + bottomInset,
          paddingBottom: bottomInset,
          paddingHorizontal: 24,
        },
        tabBarItemStyle: {
          flex: 1,
          paddingVertical: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: Typography.medium,
        },
      }}
    >
      <Tab.Screen
        name="Parish"
        component={CommunityScreen}
        options={{
          tabBarTestID: 'tab-parish',
          tabBarIcon: ({ color, size }) => <MCIcon name="church" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Groups"
        component={PrayerScreen}
        options={{
          tabBarTestID: 'tab-groups',
          tabBarIcon: ({ color, size }) => <Icon name="people-circle-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          tabBarTestID: 'tab-friends',
          tabBarIcon: ({ color, size }) => <Icon name="people-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          lazy: false,
          tabBarTestID: 'tab-profile',
          tabBarIcon: ({ color, size }) => <ProfileTabIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
