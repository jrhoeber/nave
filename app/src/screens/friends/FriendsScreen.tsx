import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyStateBox } from '../../components/ui/EmptyStateBox';
import { AddFriendModal } from '../../components/friends/AddFriendModal';
import { useFriendsStore } from '../../store/friendsStore';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import type { Friendship } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

export function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const { friends, incomingRequests, isLoading, fetchFriends, acceptRequest, rejectRequest } = useFriendsStore();
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
        <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(item.id)} activeOpacity={0.8}>
          <Text style={styles.acceptBtnLabel}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(item.id)} activeOpacity={0.8}>
          <Text style={styles.rejectBtnLabel}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Friend card ───────────────────────────────────────────────────────────

  const renderFriend = ({ item, index, isLast }: { item: Friendship; index: number; isLast: boolean }) => (
    <TouchableOpacity
      style={styles.friendRow}
      onPress={() => navigation.navigate('UserProfile', { id: item.user.id })}
      activeOpacity={0.85}
    >
      <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={50} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.user.displayName}</Text>
        <Text style={styles.userHandle}>@{item.user.username}</Text>
        {item.user.parish && (
            <Text style={styles.userParish} numberOfLines={1}>{item.user.parish}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // ─── List data ─────────────────────────────────────────────────────────────

  type ListItem =
    | { type: 'requests-header' }
    | { type: 'request'; data: Friendship; index: number }
    | { type: 'friends-label' }
    | { type: 'friend'; data: Friendship; index: number; isLast: boolean };

  const listData: ListItem[] = [];

  if (incomingRequests.length > 0) {
    listData.push({ type: 'requests-header' });
    incomingRequests.forEach((r, i) => listData.push({ type: 'request', data: r, index: i }));
  }

  if (friends.length > 0) {
    listData.push({ type: 'friends-label' });
    friends.forEach((f, i) => listData.push({ type: 'friend', data: f, index: i, isLast: i === friends.length - 1 }));
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'requests-header') {
      return <Text style={styles.sectionLabel}>FRIEND REQUESTS · {incomingRequests.length}</Text>;
    }
    if (item.type === 'request') return renderRequest({ item: item.data, index: item.index });
    if (item.type === 'friends-label') {
      return <Text style={styles.sectionLabel}>YOUR FRIENDS</Text>;
    }
    return (
      <View style={[styles.friendWrapper, item.index === 0 && styles.friendWrapperFirst]}>
        {renderFriend({ item: item.data, index: item.index, isLast: item.isLast })}
      </View>
    );
  };

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

      <FlatList
        data={listData}
        keyExtractor={(item, index) => {
          if (item.type === 'requests-header') return 'header-requests';
          if (item.type === 'friends-label') return 'header-friends';
          if (item.type === 'request') return `req-${item.data.id}`;
          return `friend-${item.data.id}`;
        }}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListFooterComponent={friends.length > 0 ? <View style={styles.cardBottom} /> : null}
        ListEmptyComponent={!isLoading && friends.length === 0 ? (
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
  list: { paddingBottom: Spacing[10] },

  // ── Friend rows (continuous card, matches Groups) ─────────────────────────
  friendWrapper: {
    backgroundColor: '#ffffff',
    marginHorizontal: Spacing[3],
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#d8d3cb',
  },
  friendWrapperFirst: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  cardBottom: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginHorizontal: Spacing[3],
    minHeight: Spacing[3],
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#d8d3cb',
  },

  // ── User info (shared) ────────────────────────────────────────────────────
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  userHandle: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },
  userParish: { fontSize: Typography.xs, color: Colors.textLight, marginTop: Spacing[1] },

  // ── Request cards ─────────────────────────────────────────────────────────
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing[3],
    marginBottom: Spacing[3],
    marginHorizontal: Spacing[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d8d3cb',
  },
  requestUserRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[3] },
  requestActions: { flexDirection: 'row', gap: Spacing[2] },
  acceptBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing[2], alignItems: 'center' },
  acceptBtnLabel: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textInverse },
  rejectBtn: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingVertical: Spacing[2], alignItems: 'center' },
  rejectBtnLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },

});
