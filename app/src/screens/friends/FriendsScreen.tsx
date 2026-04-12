import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { useFriendsStore } from '../../store/friendsStore';
import { api, mapFriendSearchResult } from '../../lib/apiClient';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { Friendship, FriendSearchResult } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

export function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const { friends, incomingRequests, isLoading, fetchFriends, acceptRequest, rejectRequest } = useFriendsStore();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchFriends(); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.searchFriends(search.trim());
        setSearchResults(res.users.map(mapFriendSearchResult));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [search]);

  const handleAddFriend = async (item: FriendSearchResult) => {
    setPendingIds((p) => new Set(p).add(item.id));
    try {
      await api.sendFriendRequest(item.id);
      setSearchResults((prev) =>
        prev.map((u) => u.id === item.id ? { ...u, friendshipStatus: 'pending', isRequester: true } : u),
      );
    } catch {
      setSearchResults((prev) =>
        prev.map((u) => u.id === item.id ? { ...u, friendshipStatus: 'pending', isRequester: true } : u),
      );
    } finally {
      setPendingIds((p) => { const next = new Set(p); next.delete(item.id); return next; });
    }
  };

  // ─── Search result card ────────────────────────────────────────────────────

  const renderSearchResult = ({ item }: { item: FriendSearchResult }) => {
    const isAdding = pendingIds.has(item.id);
    const status = item.friendshipStatus;
    const canAdd = !status;

    let badgeLabel = '';
    let badgeStyle = styles.badgeNeutral;
    let badgeTextStyle = styles.badgeTextNeutral;

    if (status === 'accepted') {
      badgeLabel = 'Friends';
    } else if (status === 'pending' && item.isRequester) {
      badgeLabel = 'Requested';
    } else if (status === 'pending' && !item.isRequester) {
      badgeLabel = 'Wants to connect';
      badgeStyle = styles.badgePrimary;
      badgeTextStyle = styles.badgeTextPrimary;
    } else {
      badgeLabel = 'Add';
      badgeStyle = styles.badgeAdd;
      badgeTextStyle = styles.badgeTextAdd;
    }

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigation.navigate('UserProfile', { id: item.id })}
        activeOpacity={0.85}
      >
        <Avatar uri={item.avatarUrl} name={item.displayName} size={50} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.userHandle}>@{item.username}</Text>
          {item.parish && (
            <View style={styles.parishRow}>
              <Icon name="business-outline" size={11} color={Colors.textLight} />
              <Text style={styles.userParish} numberOfLines={1}>{item.parish}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.badge, badgeStyle, (!canAdd || isAdding) && styles.badgeDisabled]}
          onPress={canAdd && !isAdding ? () => handleAddFriend(item) : undefined}
          disabled={!canAdd || isAdding}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isAdding
            ? <ActivityIndicator size="small" color={Colors.textInverse} />
            : <Text style={[styles.badgeText, badgeTextStyle]}>{badgeLabel}</Text>
          }
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ─── Request card ──────────────────────────────────────────────────────────

  const renderRequest = ({ item }: { item: Friendship }) => (
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
            <View style={styles.parishRow}>
              <Icon name="business-outline" size={11} color={Colors.textLight} />
              <Text style={styles.userParish} numberOfLines={1}>{item.user.parish}</Text>
            </View>
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

  const renderFriend = ({ item }: { item: Friendship }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => navigation.navigate('UserProfile', { id: item.user.id })}
      activeOpacity={0.85}
    >
      <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={50} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.user.displayName}</Text>
        <Text style={styles.userHandle}>@{item.user.username}</Text>
        {item.user.parish && (
          <View style={styles.parishRow}>
            <Icon name="business-outline" size={11} color={Colors.textLight} />
            <Text style={styles.userParish} numberOfLines={1}>{item.user.parish}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // ─── List data ─────────────────────────────────────────────────────────────

  const isSearching = search.trim().length > 0;

  type ListItem =
    | { type: 'requests-header' }
    | { type: 'request'; data: Friendship }
    | { type: 'friends-header' }
    | { type: 'friend'; data: Friendship }
    | { type: 'search-result'; data: FriendSearchResult };

  let listData: ListItem[] = [];

  if (isSearching) {
    listData = searchResults.map((r) => ({ type: 'search-result', data: r }));
  } else {
    if (incomingRequests.length > 0) {
      listData.push({ type: 'requests-header' });
      incomingRequests.forEach((r) => listData.push({ type: 'request', data: r }));
    }
    if (friends.length > 0 || incomingRequests.length > 0) {
      listData.push({ type: 'friends-header' });
    }
    friends.forEach((f) => listData.push({ type: 'friend', data: f }));
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'requests-header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Friend Requests</Text>
          <Text style={styles.sectionCount}>{incomingRequests.length}</Text>
        </View>
      );
    }
    if (item.type === 'request') return renderRequest({ item: item.data });
    if (item.type === 'friends-header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Friends</Text>
          <Text style={styles.sectionCount}>{friends.length}</Text>
        </View>
      );
    }
    if (item.type === 'friend') return renderFriend({ item: item.data });
    return renderSearchResult({ item: item.data });
  };

  const emptyComponent = () => {
    if (isSearching) {
      if (searching) return null;
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No results for "{search}"</Text>
        </View>
      );
    }
    if (isLoading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>👐</Text>
        <Text style={styles.emptyTitle}>No friends yet</Text>
        <Text style={styles.emptySubtitle}>Search for Catholics to connect with</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.subtitle}>Your Catholic community</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={17} color={Colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search friends or find new ones..."
          placeholderTextColor={Colors.textLight}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close-circle" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {searching && <ActivityIndicator style={styles.searchLoader} color={Colors.primary} />}

      <FlatList
        data={listData}
        keyExtractor={(item, index) => {
          if (item.type === 'requests-header') return 'header-requests';
          if (item.type === 'friends-header') return 'header-friends';
          if (item.type === 'request') return `req-${item.data.id}`;
          if (item.type === 'friend') return `friend-${item.data.id}`;
          return `search-${item.data.id}`;
        }}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          !isSearching
            ? <RefreshControl refreshing={isLoading} onRefresh={fetchFriends} tintColor={Colors.primary} />
            : undefined
        }
        ListEmptyComponent={emptyComponent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing[5], paddingVertical: Spacing[4], borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing[4], marginVertical: Spacing[3], borderRadius: Radius.md, paddingHorizontal: Spacing[3], borderWidth: 1.5, borderColor: Colors.border, gap: Spacing[2] },
  searchInput: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary, paddingVertical: Spacing[3] },
  searchLoader: { marginBottom: Spacing[2] },
  list: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[10] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: Spacing[3], marginTop: Spacing[1] },
  sectionTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textInverse, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  // Cards
  userCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing[4], flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[3], ...Shadows.sm },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  userHandle: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },
  parishRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: Spacing[1] },
  userParish: { fontSize: Typography.xs, color: Colors.textLight, flexShrink: 1 },
  // Request card
  requestCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing[3], marginBottom: Spacing[3], ...Shadows.sm, borderWidth: 1, borderColor: Colors.primary + '20' },
  requestUserRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[3] },
  requestActions: { flexDirection: 'row', gap: Spacing[2] },
  acceptBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing[2], alignItems: 'center' },
  acceptBtnLabel: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textInverse },
  rejectBtn: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingVertical: Spacing[2], alignItems: 'center' },
  rejectBtnLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },
  // Search result badges
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing[3], paddingVertical: 5, minWidth: 64, alignItems: 'center' },
  badgeText: { fontSize: Typography.xs, fontWeight: Typography.semibold },
  badgeAdd: { backgroundColor: Colors.primary },
  badgeTextAdd: { color: Colors.textInverse },
  badgePrimary: { backgroundColor: Colors.primary + '18', borderWidth: 1, borderColor: Colors.primary + '40' },
  badgeTextPrimary: { color: Colors.primary },
  badgeNeutral: { backgroundColor: Colors.surfaceAlt },
  badgeTextNeutral: { color: Colors.textSecondary },
  badgeDisabled: { opacity: 0.6 },
  // Empty
  empty: { alignItems: 'center', paddingVertical: Spacing[16], paddingHorizontal: Spacing[8] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing[4] },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[2], textAlign: 'center' },
  emptySubtitle: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center' },
});
