import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrayerGroupCard } from '../../components/prayer/PrayerGroupCard';
import { EditPrayerGroupModal } from '../../components/prayer/EditPrayerGroupModal';
import { AddGroupModal } from '../../components/prayer/AddGroupModal';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyStateBox } from '../../components/ui/EmptyStateBox';
import { useTabBarContentPadding } from '../../navigation/AppNavigator';
import { usePrayerStore } from '../../store/prayerStore';
import { useGroupChatStore } from '../../store/groupChatStore';
import { useAuthStore } from '../../store/authStore';
import { api, mapGroupMessage, mapPrayerGroup } from '../../lib/apiClient';
import { markNotificationsRead, syncBadgeCount } from '../../lib/notifications';
import { CardList, Colors, Radius, Spacing, Typography } from '../../theme';
import type { GroupInvitation, PrayerGroup } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';
import { Text } from '../../components/ui/Text';

export function GroupScreen() {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarContentPadding();
  const navigation = useNavigation<RootNavigationProp>();
  const myGroups = usePrayerStore((s) => s.myGroups);
  const invitations = usePrayerStore((s) => s.invitations);
  const isLoading = usePrayerStore((s) => s.isLoading);
  const hasFetchedGroups = usePrayerStore((s) => s.hasFetchedGroups);
  const hasFetchedInvitations = usePrayerStore((s) => s.hasFetchedInvitations);
  const fetchGroups = usePrayerStore((s) => s.fetchGroups);
  const fetchInvitations = usePrayerStore((s) => s.fetchInvitations);
  const acceptInvitation = usePrayerStore((s) => s.acceptInvitation);
  const declineInvitation = usePrayerStore((s) => s.declineInvitation);
  const joinGroup = usePrayerStore((s) => s.joinGroup);
  const leaveGroup = usePrayerStore((s) => s.leaveGroup);
  const deleteGroup = usePrayerStore((s) => s.deleteGroup);
  const muteGroup = usePrayerStore((s) => s.muteGroup);
  const unmuteGroup = usePrayerStore((s) => s.unmuteGroup);
  const loadMuteStatus = usePrayerStore((s) => s.loadMuteStatus);
  const mutedGroupIds = usePrayerStore((s) => s.mutedGroupIds);
  const messagesByGroup = useGroupChatStore((s) => s.messagesByGroup);
  const lastReadIdByGroup = useGroupChatStore((s) => s.lastReadIdByGroup);
  const appendNewMessages = useGroupChatStore((s) => s.appendNewMessages);
  const loadGroupBaseline = useGroupChatStore((s) => s.loadGroupBaseline);
  const [editingGroup, setEditingGroup] = useState<PrayerGroup | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const parishName = useAuthStore((s) => s.user?.parish);
  const [parishGroups, setParishGroups] = useState<PrayerGroup[]>([]);

  useEffect(() => {
    if (!hasFetchedGroups) fetchGroups();
    if (!hasFetchedInvitations) fetchInvitations();
  }, [hasFetchedGroups, hasFetchedInvitations, fetchGroups, fetchInvitations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchGroups(), fetchInvitations()]);
    setRefreshing(false);
  }, [fetchGroups, fetchInvitations]);

  useFocusEffect(useCallback(() => {
    // Refresh invitations when returning to the tab (cheap, single endpoint).
    if (hasFetchedInvitations) fetchInvitations();
    // The Groups tab surfaces invites, approval requests, and approved-into.
    // Mark all of those types read together.
    Promise.all([
      markNotificationsRead({ type: 'group_invite' }),
      markNotificationsRead({ type: 'group_approval_needed' }),
      markNotificationsRead({ type: 'group_approved' }),
    ]).then(() => syncBadgeCount());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  // Fetch public parish groups for the empty state
  useEffect(() => {
    if (myGroups.length === 0 && parishName) {
      api.searchParishGroups(parishName).then((data) => {
        setParishGroups(data.groups.map(mapPrayerGroup).filter((g) => !g.isMember));
      }).catch(() => {});
    }
  }, [myGroups.length, parishName]);

  // Load mute status for all member groups when the list changes
  const memberIdsKey = useMemo(
    () => myGroups.filter((g) => g.isMember).map((g) => g.id).join(','),
    [myGroups],
  );
  useEffect(() => {
    myGroups.filter((g) => g.isMember).forEach((g) => loadMuteStatus(g.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberIdsKey]);

  // When myGroups first loads (or changes), establish a read baseline for each
  // member group that hasn't been loaded yet. Idempotent — no-op if already done.
  useEffect(() => {
    myGroups.filter((g) => g.isMember).forEach((g) => loadGroupBaseline(g.id));
  }, [myGroups]);

  // Keep refs so the focus-effect callback reads current values without causing
  // it to re-register every time messages change.
  const myGroupsRef = useRef(myGroups);
  const messagesByGroupRef = useRef(messagesByGroup);
  useEffect(() => { myGroupsRef.current = myGroups; }, [myGroups]);
  useEffect(() => { messagesByGroupRef.current = messagesByGroup; }, [messagesByGroup]);

  // Each time the screen gains focus (e.g. navigating back from a chat), poll
  // for messages newer than the latest known one in each loaded group.
  useFocusEffect(
    useCallback(() => {
      const { mutedGroupIds } = usePrayerStore.getState();
      myGroupsRef.current.filter((g) => g.isMember && !mutedGroupIds.has(g.id)).forEach(async (g) => {
        const messages = messagesByGroupRef.current[g.id];
        if (!messages?.length) return; // baseline not yet loaded; useEffect handles it
        try {
          const data = await api.getGroupMessages(g.id, undefined, 20, messages[0].createdAt);
          if (data.messages.length > 0) {
            appendNewMessages(g.id, data.messages.map(mapGroupMessage));
          }
        } catch {
          // Silently ignore
        }
      });
    }, [appendNewMessages]),
  );

  const getUnreadCount = (groupId: string) => {
    const messages = messagesByGroup[groupId];
    const lastReadId = lastReadIdByGroup[groupId];
    if (!messages || !lastReadId) return 0;
    const idx = messages.findIndex((m) => m.id === lastReadId);
    return idx > 0 ? idx : 0;
  };

  // ─── List data (FriendsScreen pattern) ────────────────────────────────────

  type ListItem =
    | { type: 'invitations-header' }
    | { type: 'invitation'; data: GroupInvitation }
    | { type: 'groups-label' }
    | { type: 'group'; data: PrayerGroup; index: number; isLast: boolean };

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    if (invitations.length > 0) {
      items.push({ type: 'invitations-header' });
      invitations.forEach((inv) => items.push({ type: 'invitation', data: inv }));
    }
    if (myGroups.length > 0) {
      items.push({ type: 'groups-label' });
      myGroups.forEach((g, i) => items.push({ type: 'group', data: g, index: i, isLast: i === myGroups.length - 1 }));
    }
    return items;
  }, [invitations, myGroups]);

  const openGroupChat = useCallback((id: string) => navigation.navigate('GroupMessage', { id }), [navigation]);
  const onEditGroup = useCallback(
    (id: string) => setEditingGroup(myGroups.find((g) => g.id === id) ?? null),
    [myGroups],
  );

  const renderListItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'invitations-header') {
      return <Text style={styles.sectionLabel}>INVITATIONS {invitations.length > 0 ? `· ${invitations.length}` : ''}</Text>;
    }
    if (item.type === 'invitation') {
      const inv = item.data;
      return (
        <View style={styles.invitationCard}>
          <TouchableOpacity
            style={styles.invitationRow}
            onPress={() => navigation.navigate('GroupProfile', { id: inv.group.id })}
            activeOpacity={0.85}
          >
            <Avatar uri={inv.group.avatarUrl} name={inv.group.name} size={46} />
            <View style={styles.invitationInfo}>
              <Text style={styles.invitationName} numberOfLines={1}>{inv.group.name}</Text>
              <Text style={styles.invitationMeta} numberOfLines={1}>Invited by {inv.invitedBy.displayName}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.invitationActions}>
            <Button label="Accept" size="sm" onPress={() => acceptInvitation(inv.group.id)} style={{ flex: 1 }} />
            <Button label="Decline" variant="ghost" size="sm" onPress={() => declineInvitation(inv.group.id)} textStyle={{ color: Colors.textSecondary }} style={{ flex: 1 }} />
          </View>
        </View>
      );
    }
    if (item.type === 'groups-label') {
      return <Text style={styles.sectionLabel}>YOUR GROUPS</Text>;
    }
    return (
      <View style={[CardList.item, item.index === 0 && CardList.itemFirst, item.isLast && CardList.itemLast]}>
        <PrayerGroupCard
          group={item.data}
          onPress={openGroupChat}
          onJoin={joinGroup}
          onLeave={leaveGroup}
          onEdit={onEditGroup}
          onDelete={deleteGroup}
          onMute={muteGroup}
          onUnmute={unmuteGroup}
          isMuted={mutedGroupIds.has(item.data.id)}
          unreadCount={getUnreadCount(item.data.id)}
          lastMessageAt={messagesByGroup[item.data.id]?.[0]?.createdAt}
          isLast={item.isLast}
        />
      </View>
    );
  }, [
    invitations.length,
    navigation,
    acceptInvitation,
    declineInvitation,
    openGroupChat,
    joinGroup,
    leaveGroup,
    onEditGroup,
    deleteGroup,
    muteGroup,
    unmuteGroup,
    mutedGroupIds,
    messagesByGroup,
    lastReadIdByGroup,
  ]);

  const keyExtractor = useCallback((item: ListItem) => {
    if (item.type === 'invitations-header') return 'header-invitations';
    if (item.type === 'invitation') return `inv-${item.data.id}`;
    if (item.type === 'groups-label') return 'header-groups';
    return `group-${item.data.id}`;
  }, []);

  const headerContent = (
    <View style={styles.header}>
      <Text style={styles.title}>Groups</Text>
      <Text style={styles.subtitle}>
        <Text style={styles.subtitleVerse}>{'“'}For where two or three are gathered in my name, there am I in the midst of them.{'”'}</Text>
        {'\n'}
        <Text style={styles.subtitleRef}>Matthew 18:20</Text>
      </Text>
      <TouchableOpacity style={styles.startGroupBtn} onPress={() => setAddModalVisible(true)} testID="groups-add-btn" activeOpacity={0.7}>
        <Text style={styles.startGroupText}>Join a group</Text>
        <Text style={styles.startGroupArrow}>{'→'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {hasFetchedGroups && hasFetchedInvitations && myGroups.length === 0 && invitations.length === 0 && !isLoading ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: tabBarPadding }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {headerContent}

          {parishGroups.length > 0 ? (
            <View style={styles.suggestedSection}>
              <Text style={styles.sectionLabel}>GROUPS AT {(parishName ?? 'YOUR PARISH').toUpperCase()}</Text>
              <>
                {parishGroups.map((group, index) => (
                  <View key={group.id} style={[CardList.item, index === 0 && CardList.itemFirst, index === parishGroups.length - 1 && CardList.itemLast]}>
                    <PrayerGroupCard
                      group={group}
                      onPress={(id) => navigation.navigate('GroupProfile', { id })}
                      onJoin={(id) => joinGroup(id, group)}
                      onLeave={leaveGroup}
                      onEdit={(id) => setEditingGroup(myGroups.find((g) => g.id === id) ?? null)}
                      onDelete={deleteGroup}
                      isLast={index === parishGroups.length - 1}
                    />
                  </View>
                ))}
              </>
            </View>
          ) : (
            <EmptyStateBox
              title="Be the first to gather."
              body={`No groups have started at ${parishName ?? 'your parish'} yet. A Bible study, a men’s group, a women’s group — all begin with a first step.`}
              actionLabel="Start a group"
              onAction={() => navigation.navigate('CreateGroup')}
              style={{ marginTop: Spacing[4] }}
            />
          )}
        </ScrollView>
      ) : (
        <FlashList
          testID="groups-list"
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderListItem}
          getItemType={(item) => item.type}
          contentContainerStyle={{ paddingBottom: tabBarPadding }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListHeaderComponent={headerContent}
          ListFooterComponent={null}
        />
      )}

      {editingGroup && (
        <EditPrayerGroupModal
          group={editingGroup}
          visible
          onClose={() => setEditingGroup(null)}
        />
      )}

      <AddGroupModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onCreateGroup={() => navigation.navigate('CreateGroup')}
        onJoinGroup={(id) => { setAddModalVisible(false); fetchGroups(); }}
        onOpenGroup={(id) => navigation.navigate('GroupProfile', { id })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing[5], paddingVertical: Spacing[4] },
  title: { fontFamily: Typography.fontSans, fontSize: 30, fontWeight: Typography.semibold, color: Colors.textPrimary, letterSpacing: -0.8 },
  subtitle: { marginTop: Spacing[2], marginRight: 96 },
  subtitleVerse: { fontFamily: 'Cormorant Garamond', fontSize: 20, color: Colors.textPrimary, lineHeight: 28 },
  subtitleRef: { fontSize: Typography.sm, color: Colors.textSecondary, letterSpacing: 0.3, lineHeight: Typography.sm * 2 },
  startGroupBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: Spacing[2], marginTop: Spacing[3], borderBottomWidth: 2, borderBottomColor: Colors.accent, paddingBottom: 4 },
  startGroupText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  startGroupArrow: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textSecondary },
  sectionLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary, letterSpacing: 1, paddingHorizontal: Spacing[5], paddingTop: Spacing[2], paddingBottom: Spacing[3] },
  suggestedSection: { marginTop: Spacing[2] },
  invitationCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing[3],
    marginBottom: Spacing[3],
    marginHorizontal: Spacing[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.cardBorder,
  },
  invitationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[3] },
  invitationInfo: { flex: 1, minWidth: 0 },
  invitationName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  invitationMeta: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  invitationActions: { flexDirection: 'row', gap: Spacing[2] },
});
