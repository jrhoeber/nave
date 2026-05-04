import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyStateBox } from '../../components/ui/EmptyStateBox';
import { AddFriendModal } from '../../components/friends/AddFriendModal';
import { useTabBarContentPadding } from '../../navigation/AppNavigator';
import { useFriendsStore } from '../../store/friendsStore';
import { CardList, Colors, Radius, Spacing, Typography } from '../../theme';
import type { Friendship } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

export function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarContentPadding();
  const navigation = useNavigation<RootNavigationProp>();
  const friends = useFriendsStore((s) => s.friends);
  const incomingRequests = useFriendsStore((s) => s.incomingRequests);
  const isLoading = useFriendsStore((s) => s.isLoading);
  const hasFetched = useFriendsStore((s) => s.hasFetched);
  const fetchFriends = useFriendsStore((s) => s.fetchFriends);
  const acceptRequest = useFriendsStore((s) => s.acceptRequest);
  const rejectRequest = useFriendsStore((s) => s.rejectRequest);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchFriends(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFriends();
    setRefreshing(false);
  }, [fetchFriends]);

  // ─── Request card ──────────────────────────────────────────────────────────

  const renderRequest = ({ item, index }: { item: Friendship; index: number }) => (
    <View style={styles.requestCard}>
      <TouchableOpacity
        style={styles.requestUserRow}
        onPress={() => navigation.navigate('UserProfile', { id: item.user.id })}
        activeOpacity={0.85}
      >
        <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={46} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.user.displayName}</Text>
          <Text style={styles.userHandle}>@{item.user.username}</Text>
          {item.user.parish && (
            <Text style={styles.userParish} numberOfLines={1}>{item.user.parish}</Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.requestActions}>
        <Button label="Accept" size="sm" onPress={() => acceptRequest(item.id)} style={{ flex: 1 }} />
        <Button label="Decline" variant="ghost" size="sm" onPress={() => rejectRequest(item.id)} textStyle={{ color: Colors.textSecondary }} style={{ flex: 1 }} />
      </View>
    </View>
  );

  // ─── Friend card ───────────────────────────────────────────────────────────

  const renderFriend = ({ item, index, isLast }: { item: Friendship; index: number; isLast: boolean }) => (
    <TouchableOpacity
      style={[styles.friendCard, isLast && styles.friendCardLast]}
      onPress={() => navigation.navigate('UserProfile', { id: item.user.id })}
      activeOpacity={0.97}
    >
      <View style={styles.friendRow}>
        <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={42} />
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{item.user.displayName}</Text>
          <Text style={styles.userMeta} numberOfLines={1}>
            @{item.user.username}{item.user.parish ? ` · ${item.user.parish}` : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ─── List data ─────────────────────────────────────────────────────────────

  type ListItem =
    | { type: 'requests-header' }
    | { type: 'request'; data: Friendship; index: number }
    | { type: 'friends-label' }
    | { type: 'friend'; data: Friendship; index: number; isLast: boolean };

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    if (incomingRequests.length > 0) {
      items.push({ type: 'requests-header' });
      incomingRequests.forEach((r, i) => items.push({ type: 'request', data: r, index: i }));
    }
    if (friends.length > 0) {
      items.push({ type: 'friends-label' });
      friends.forEach((f, i) => items.push({ type: 'friend', data: f, index: i, isLast: i === friends.length - 1 }));
    }
    return items;
  }, [friends, incomingRequests]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'requests-header') {
      return <Text style={styles.sectionLabel}>FRIEND REQUESTS · {incomingRequests.length}</Text>;
    }
    if (item.type === 'request') return renderRequest({ item: item.data, index: item.index });
    if (item.type === 'friends-label') {
      return <Text style={styles.sectionLabel}>YOUR FRIENDS</Text>;
    }
    return (
      <View style={[CardList.item, item.index === 0 && CardList.itemFirst, item.isLast && CardList.itemLast]}>
        {renderFriend({ item: item.data, index: item.index, isLast: item.isLast })}
      </View>
    );
  }, [incomingRequests.length, navigation, acceptRequest, rejectRequest]);

  const keyExtractor = useCallback((item: ListItem) => {
    if (item.type === 'requests-header') return 'header-requests';
    if (item.type === 'friends-label') return 'header-friends';
    if (item.type === 'request') return `req-${item.data.id}`;
    return `friend-${item.data.id}`;
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.subtitle}>
          <Text style={styles.subtitleVerse}>{'\u201C'}A faithful friend is a sturdy shelter; he who finds one finds a treasure.{'\u201D'}</Text>
          {'\n'}
          <Text style={styles.subtitleRef}>Sirach 6:14</Text>
        </Text>
        <TouchableOpacity style={styles.findBtn} onPress={() => setAddModalVisible(true)} activeOpacity={0.7}>
          <Text style={styles.findBtnText}>Find friends</Text>
          <Text style={styles.findBtnArrow}>{'\u2192'}</Text>
        </TouchableOpacity>
      </View>

      <FlashList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemType={(item) => item.type}
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListFooterComponent={null}
        ListEmptyComponent={hasFetched && !isLoading && friends.length === 0 ? (
          <EmptyStateBox
            title="No friends yet"
            body="Connect with others in your parish community"
            actionLabel="Find friends"
            onAction={() => setAddModalVisible(true)}
            style={{ marginTop: Spacing[4] }}
          />
        ) : null}
      />

      <AddFriendModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ── Header (matches Groups) ───────────────────────────────────────────────
  header: { paddingHorizontal: Spacing[5], paddingVertical: Spacing[4] },
  title: { fontFamily: Typography.fontSans, fontSize: 30, fontWeight: Typography.semibold, color: '#1a1a1a', letterSpacing: -0.8 },
  subtitle: { marginTop: Spacing[2], marginRight: 96 },
  subtitleVerse: { fontFamily: 'Cormorant Garamond', fontSize: 20, color: '#1a1a1a', lineHeight: 28 },
  subtitleRef: { fontSize: Typography.sm, color: Colors.textSecondary, letterSpacing: 0.3, lineHeight: Typography.sm * 2 },
  findBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: Spacing[2], marginTop: Spacing[3], borderBottomWidth: 2, borderBottomColor: Colors.accent, paddingBottom: 4 },
  findBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  findBtnArrow: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textSecondary },

  // ── Section labels ────────────────────────────────────────────────────────
  sectionLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary, letterSpacing: 1, paddingHorizontal: Spacing[5], paddingTop: Spacing[2], paddingBottom: Spacing[3] },

  // ── List ───────────────────────────────────────────────────────────────────

  friendCard: { paddingHorizontal: Spacing[5], paddingVertical: Spacing[4], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.cardBorder },
  friendCardLast: { borderBottomWidth: 0 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },

  // ── User info (shared) ────────────────────────────────────────────────────
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary, flexShrink: 1 },
  userMeta: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },

  // ── Request cards ─────────────────────────────────────────────────────────
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing[3],
    marginBottom: Spacing[3],
    marginHorizontal: Spacing[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.cardBorder,
  },
  requestUserRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[3] },
  requestActions: { flexDirection: 'row', gap: Spacing[2] },

});
