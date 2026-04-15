import React, { useEffect } from 'react';
import { AppState, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GroupScreen } from '../screens/group/GroupScreen';
import { ParishScreen } from '../screens/parish/ParishScreen';
import { FriendsScreen } from '../screens/friends/FriendsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { Avatar } from '../components/ui/Avatar';
import { useAuthStore } from '../store/authStore';
import { useFriendsStore } from '../store/friendsStore';
import { useGroupChatStore } from '../store/groupChatStore';
import { usePrayerStore } from '../store/prayerStore';
import { api, mapGroupMessage } from '../lib/apiClient';
import { TabBadge } from '../components/ui/TabBadge';
import { Colors, Typography } from '../theme';
import type { AppTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<AppTabParamList>();

const styles = StyleSheet.create({
  iconWrapper: {
    position: 'relative',
  },
});

function TabIconWithBadge({ name, color, size, showBadge }: { name: string; color: string; size: number; showBadge: boolean }) {
  return (
    <View style={styles.iconWrapper}>
      <Icon name={name} size={size} color={color} />
      <TabBadge show={showBadge} />
    </View>
  );
}

function ProfileTabIcon({ color, size }: { color: string; size: number }) {
  const user = useAuthStore((s) => s.user);
  if (user?.avatarUrl) {
    return <Avatar uri={user.avatarUrl} name={user.displayName} size={size} />;
  }
  return <Icon name="person-outline" size={size} color={color} />;
}

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  const incomingRequestCount = useFriendsStore((s) => s.incomingRequests.length);
  const messagesByGroup = useGroupChatStore((s) => s.messagesByGroup);
  const lastReadIdByGroup = useGroupChatStore((s) => s.lastReadIdByGroup);
  const hydrateLastRead = useGroupChatStore((s) => s.hydrateLastRead);
  const loadGroupBaseline = useGroupChatStore((s) => s.loadGroupBaseline);
  const { myGroups, fetchGroups, mutedGroupIds } = usePrayerStore();

  const totalUnreadCount = Object.keys(messagesByGroup).reduce((total, groupId) => {
    if (mutedGroupIds.has(groupId)) return total;
    const messages = messagesByGroup[groupId];
    const lastReadId = lastReadIdByGroup[groupId];
    if (!messages || !lastReadId) return total;
    const idx = messages.findIndex((m) => m.id === lastReadId);
    return total + (idx === -1 ? messages.length : idx);
  }, 0);
  const bottomInset = insets.bottom || 0;

  // On mount: restore persisted read positions then fetch groups so the nav badge
  // is accurate before the user ever visits the Groups tab.
  useEffect(() => {
    hydrateLastRead().then(() => fetchGroups());
  }, []);

  // When the group list loads, fetch message baselines for each member group.
  useEffect(() => {
    myGroups.filter((g) => g.isMember).forEach((g) => loadGroupBaseline(g.id));
  }, [myGroups]);

  // Poll all member groups every 30s and on app foreground so the nav badge
  // stays current regardless of which tab is active.
  useEffect(() => {
    const pollAll = async () => {
      if (AppState.currentState !== 'active') return;
      const { messagesByGroup, appendNewMessages } = useGroupChatStore.getState();
      const { myGroups: groups, mutedGroupIds: muted } = usePrayerStore.getState();
      for (const g of groups.filter((g) => g.isMember && !muted.has(g.id))) {
        const messages = messagesByGroup[g.id];
        if (!messages?.length) continue;
        try {
          const data = await api.getGroupMessages(g.id, undefined, 20, messages[0].createdAt);
          if (data.messages.length > 0) {
            appendNewMessages(g.id, data.messages.map(mapGroupMessage));
          }
        } catch {}
      }
    };

    const interval = setInterval(pollAll, 30000);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') pollAll();
    });
    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, []);

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
        component={ParishScreen}
        options={{
          tabBarTestID: 'tab-parish',
          tabBarIcon: ({ color, size }) => <MCIcon name="church" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupScreen}
        options={{
          tabBarTestID: 'tab-groups',
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge name="people-circle-outline" color={color} size={size} showBadge={totalUnreadCount > 0} />
          ),
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          tabBarTestID: 'tab-friends',
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge name="people-outline" color={color} size={size} showBadge={incomingRequestCount > 0} />
          ),
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
