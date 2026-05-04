import React, { useEffect } from 'react';
import { AppState, View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
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

// Tab bar tokens matching the Nave design language
const INK = '#1A1A1A';
const INK_40 = 'rgba(26,26,26,0.4)';
const HAIR = 'rgba(26,26,26,0.08)';
const PAPER = Colors.background;

const Tab = createBottomTabNavigator<AppTabParamList>();

const styles = StyleSheet.create({
  iconWrapper: {
    position: 'relative',
  },
  profileRing: {
    width: 30,
    height: 30,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInactive: {
    opacity: 0.5,
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarFallbackBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});

// ─── Glyph: Parish (chapel front elevation) ───────────────
function ChapelIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path d="M11.4 2.25h1.2v1.6h1.2v1.2h-1.2v2h-1.2v-2h-1.2v-1.2h1.2z" fill={INK} />
        <Path d="M12 7.25 4.5 12.5V20.5a.75.75 0 0 0 .75.75h13.5a.75.75 0 0 0 .75-.75V12.5L12 7.25z" fill={INK} />
        <Path d="M10 21.25v-4.25a2 2 0 0 1 4 0v4.25h-4z" fill={PAPER} />
      </Svg>
    );
  }
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2.5v3.75M10.5 4h3" stroke={INK_40} strokeWidth={1.5} strokeLinecap="round" />
      <Path
        d="M12 7.25 4.5 12.5V20.5a.75.75 0 0 0 .75.75h13.5a.75.75 0 0 0 .75-.75V12.5L12 7.25z"
        stroke={INK_40} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M10 21.25v-4.25a2 2 0 0 1 4 0v4.25"
        stroke={INK_40} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Glyph: Groups (single message surface w/ tail) ───────
function GroupsIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5.5 9.75A2.75 2.75 0 0 1 8.25 7h8.5A2.75 2.75 0 0 1 19.5 9.75v5.5A2.75 2.75 0 0 1 16.75 18h-3l-2.5 2.25a.5.5 0 0 1-.83-.37V18H8.25A2.75 2.75 0 0 1 5.5 15.25v-5.5z"
          fill={INK}
        />
      </Svg>
    );
  }
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.5 9.75A2.75 2.75 0 0 1 8.25 7h8.5A2.75 2.75 0 0 1 19.5 9.75v5.5A2.75 2.75 0 0 1 16.75 18h-3l-2.5 2.25a.5.5 0 0 1-.83-.37V18H8.25A2.75 2.75 0 0 1 5.5 15.25v-5.5z"
        stroke={INK_40} strokeWidth={1.6} strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Glyph: Friends (two head/shoulder figures) ───────────
function FriendsIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Circle cx={15.25} cy={8.5} r={2.75} fill={INK} />
        <Path d="M11 18c0-2.35 1.9-4.25 4.25-4.25S19.5 15.65 19.5 18v.5h-8.5V18z" fill={INK} />
        <Circle cx={9} cy={9.25} r={3} fill={PAPER} />
        <Circle cx={9} cy={9.25} r={2.5} fill={INK} />
        <Path d="M3.75 19.25c0-2.9 2.35-5.25 5.25-5.25s5.25 2.35 5.25 5.25v.25h-10.5v-.25z" fill={PAPER} />
        <Path d="M4.25 19.25c0-2.62 2.13-4.75 4.75-4.75s4.75 2.13 4.75 4.75v.25h-9.5v-.25z" fill={INK} />
      </Svg>
    );
  }
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Circle cx={15.25} cy={8.5} r={2.5} stroke={INK_40} strokeWidth={1.4} />
      <Path
        d="M11.5 18c.4-1.95 2.05-3.5 3.75-3.5 1.7 0 3.35 1.55 3.75 3.5"
        stroke={INK_40} strokeWidth={1.4} strokeLinecap="round"
      />
      <Circle cx={9} cy={9.25} r={2.85} stroke={INK_40} strokeWidth={1.6} />
      <Path
        d="M4.5 19.25c0-2.49 2.01-4.5 4.5-4.5s4.5 2.01 4.5 4.5"
        stroke={INK_40} strokeWidth={1.6} strokeLinecap="round"
      />
    </Svg>
  );
}

function IconWithBadge({ children, showBadge }: { children: React.ReactNode; showBadge: boolean }) {
  return (
    <View style={styles.iconWrapper}>
      {children}
      <TabBadge show={showBadge} />
    </View>
  );
}

function ProfileTabIcon({ focused }: { focused: boolean }) {
  const user = useAuthStore((s) => s.user);
  const avatar = (
    <Avatar uri={user?.avatarUrl} name={user?.displayName} size={24} />
  );

  if (focused) {
    return <View style={styles.profileRing}>{avatar}</View>;
  }
  return <View style={styles.profileInactive}>{avatar}</View>;
}

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  const incomingRequestCount = useFriendsStore((s) => s.incomingRequests.length);
  const messagesByGroup = useGroupChatStore((s) => s.messagesByGroup);
  const lastReadIdByGroup = useGroupChatStore((s) => s.lastReadIdByGroup);
  const hydrateLastRead = useGroupChatStore((s) => s.hydrateLastRead);
  const loadGroupBaseline = useGroupChatStore((s) => s.loadGroupBaseline);
  const { myGroups, invitations, fetchGroups, fetchInvitations, mutedGroupIds } = usePrayerStore();

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
    fetchInvitations();
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

  // Poll friend requests every 30s and on app foreground so the Friends tab
  // badge stays current regardless of which tab is active.
  useEffect(() => {
    const { fetchFriends } = useFriendsStore.getState();
    fetchFriends();

    const interval = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      useFriendsStore.getState().fetchFriends();
    }, 30000);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') useFriendsStore.getState().fetchFriends();
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
        tabBarActiveTintColor: INK,
        tabBarInactiveTintColor: INK_40,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: HAIR,
          borderTopWidth: 1,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingHorizontal: 16,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              style={styles.tabBarBackground}
              blurType="xlight"
              blurAmount={20}
              reducedTransparencyFallbackColor="white"
            />
          ) : (
            <View style={styles.tabBarFallbackBg} />
          ),
        tabBarItemStyle: {
          flex: 1,
          paddingTop: 8,
          gap: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: Typography.medium,
          letterSpacing: 0.1,
          marginTop: 0,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tab.Screen
        name="Parish"
        component={ParishScreen}
        options={{
          tabBarTestID: 'tab-parish',
          tabBarIcon: ({ focused }) => <ChapelIcon active={focused} />,
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupScreen}
        options={{
          tabBarTestID: 'tab-groups',
          tabBarIcon: ({ focused }) => (
            <IconWithBadge showBadge={totalUnreadCount > 0 || invitations.length > 0}>
              <GroupsIcon active={focused} />
            </IconWithBadge>
          ),
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          tabBarTestID: 'tab-friends',
          tabBarIcon: ({ focused }) => (
            <IconWithBadge showBadge={incomingRequestCount > 0}>
              <FriendsIcon active={focused} />
            </IconWithBadge>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          lazy: false,
          tabBarTestID: 'tab-profile',
          tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
