import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { AddFriendModal } from '../../components/friends/AddFriendModal';
import { useFriendsStore } from '../../store/friendsStore';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { Friendship } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

export function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const { friends, incomingRequests, isLoading, fetchFriends, acceptRequest, rejectRequest } = useFriendsStore();
  const [search, setSearch] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);

  useEffect(() => { fetchFriends(); }, []);

  const filteredFriends = friends.filter(
    (f) =>
      f.user.displayName.toLowerCase().includes(search.toLowerCase()) ||
      f.user.username.toLowerCase().includes(search.toLowerCase()),
  );

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
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => acceptRequest(item.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.acceptBtnLabel}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => rejectRequest(item.id)}
          activeOpacity={0.8}
        >
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
      <TouchableOpacity style={styles.messageBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="chatbubble-outline" size={18} color={Colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // ─── List data: requests section header + friends ─────────────────────────

  type ListItem =
    | { type: 'requests-header' }
    | { type: 'request'; data: Friendship }
    | { type: 'friends-header' }
    | { type: 'friend'; data: Friendship };

  const listData: ListItem[] = [];
  if (incomingRequests.length > 0) {
    listData.push({ type: 'requests-header' });
    incomingRequests.forEach((r) => listData.push({ type: 'request', data: r }));
  }
  if (filteredFriends.length > 0 || incomingRequests.length > 0) {
    listData.push({ type: 'friends-header' });
  }
  filteredFriends.forEach((f) => listData.push({ type: 'friend', data: f }));

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
          <Text style={styles.sectionTitle}>
            {search ? 'Results' : `Friends`}
          </Text>
          {!search && <Text style={styles.sectionCount}>{friends.length}</Text>}
        </View>
      );
    }
    return renderFriend({ item: item.data });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.subtitle}>Your Catholic community</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Icon name="add" size={22} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={17} color={Colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search your friends..."
          placeholderTextColor={Colors.textLight}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close-circle" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item, index) => {
          if (item.type === 'requests-header') return 'header-requests';
          if (item.type === 'friends-header') return 'header-friends';
          if (item.type === 'request') return `req-${item.data.id}`;
          return `friend-${item.data.id}`;
        }}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchFriends} tintColor={Colors.primary} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{search ? '🔍' : '👐'}</Text>
              <Text style={styles.emptyTitle}>{search ? 'No matches found' : 'No friends yet'}</Text>
              {!search && (
                <Text style={styles.emptySubtitle}>Tap + to find and add friends</Text>
              )}
            </View>
          ) : null
        }
      />

      <AddFriendModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onRequestSent={fetchFriends}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[5], paddingVertical: Spacing[4], borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing[4], marginVertical: Spacing[3], borderRadius: Radius.md, paddingHorizontal: Spacing[3], borderWidth: 1.5, borderColor: Colors.border, gap: Spacing[2] },
  searchInput: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary, paddingVertical: Spacing[3] },
  list: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[10] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: Spacing[3], marginTop: Spacing[1] },
  sectionTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textInverse, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  // Request card
  requestCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing[3], marginBottom: Spacing[3], ...Shadows.sm, borderWidth: 1, borderColor: Colors.primary + '20' },
  requestUserRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[3] },
  requestActions: { flexDirection: 'row', gap: Spacing[2] },
  acceptBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing[2], alignItems: 'center' },
  acceptBtnLabel: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textInverse },
  rejectBtn: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingVertical: Spacing[2], alignItems: 'center' },
  rejectBtnLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },
  // Friend card
  userCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing[4], flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[3], ...Shadows.sm },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  userHandle: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },
  parishRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: Spacing[1] },
  userParish: { fontSize: Typography.xs, color: Colors.textLight, flexShrink: 1 },
  messageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary + '12', alignItems: 'center', justifyContent: 'center' },
  // Empty
  empty: { alignItems: 'center', paddingVertical: Spacing[16], paddingHorizontal: Spacing[8] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing[4] },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[2] },
  emptySubtitle: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center' },
});
