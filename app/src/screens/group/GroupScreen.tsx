import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrayerGroupCard } from '../../components/prayer/PrayerGroupCard';
import { EditPrayerGroupModal } from '../../components/prayer/EditPrayerGroupModal';
import { AddGroupModal } from '../../components/prayer/AddGroupModal';
import { EmptyStateBox } from '../../components/ui/EmptyStateBox';
import { usePrayerStore } from '../../store/prayerStore';
import { useGroupChatStore } from '../../store/groupChatStore';
import { useAuthStore } from '../../store/authStore';
import { api, mapGroupMessage, mapPrayerGroup } from '../../lib/apiClient';
import { Colors, Spacing, Typography } from '../../theme';
import type { PrayerGroup } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

export function GroupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const { myGroups, isLoading, fetchGroups, joinGroup, leaveGroup, deleteGroup, muteGroup, unmuteGroup, loadMuteStatus, mutedGroupIds } = usePrayerStore();
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
    fetchGroups();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }, [fetchGroups]);

  // Fetch public parish groups for the empty state
  useEffect(() => {
    if (myGroups.length === 0 && parishName) {
      api.searchParishGroups(parishName).then((data) => {
        setParishGroups(data.groups.map(mapPrayerGroup).filter((g) => !g.isMember));
      }).catch(() => {});
    }
  }, [myGroups.length, parishName]);

  // Load mute status for all member groups when the list changes
  useEffect(() => {
    myGroups.filter((g) => g.isMember).forEach((g) => loadMuteStatus(g.id));
  }, [myGroups.map((g) => g.id).join(',')]);

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <Text style={styles.subtitle}>
          <Text style={styles.subtitleVerse}>{'\u201C'}For where two or three are gathered in my name, there am I in the midst of them.{'\u201D'}</Text>
          {'\n'}
          <Text style={styles.subtitleRef}>Matthew 18:20</Text>
        </Text>
        <TouchableOpacity style={styles.startGroupBtn} onPress={() => setAddModalVisible(true)} testID="groups-add-btn" activeOpacity={0.7}>
          <Text style={styles.startGroupText}>Join a group</Text>
          <Text style={styles.startGroupArrow}>{'\u2192'}</Text>
        </TouchableOpacity>
      </View>

      {myGroups.length === 0 && !isLoading ? (
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >

          {parishGroups.length > 0 ? (
            <View style={styles.suggestedSection}>
              <Text style={styles.sectionLabel}>GROUPS AT {(parishName ?? 'YOUR PARISH').toUpperCase()}</Text>
              <View style={styles.suggestedCard}>
                {parishGroups.map((group, index) => (
                  <View key={group.id} style={[styles.suggestedRow, index === 0 && styles.suggestedRowFirst]}>
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
              </View>
            </View>
          ) : (
            <EmptyStateBox
              title="Be the first to gather."
              body={`No groups have started at ${parishName ?? 'your parish'} yet. A Bible study, a men\u2019s group, a women\u2019s group \u2014 all begin with a first step.`}
              actionLabel="Start a group"
              onAction={() => navigation.navigate('CreateGroup')}
              style={{ marginTop: Spacing[4] }}
            />
          )}
        </ScrollView>
      ) : (
        <FlatList
          testID="groups-list"
          data={myGroups}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<Text style={styles.sectionLabel}>YOUR GROUPS</Text>}
          renderItem={({ item, index }: { item: PrayerGroup; index: number }) => (
            <View style={[styles.groupWrapper, index === 0 && styles.groupWrapperFirst]}>
              <PrayerGroupCard
                group={item}
                onPress={(id) => navigation.navigate('GroupMessage', { id })}
                onJoin={joinGroup}
                onLeave={leaveGroup}
                onEdit={(id) => setEditingGroup(myGroups.find((g) => g.id === id) ?? null)}
                onDelete={deleteGroup}
                onMute={muteGroup}
                onUnmute={unmuteGroup}
                isMuted={mutedGroupIds.has(item.id)}
                unreadCount={getUnreadCount(item.id)}
                lastMessageAt={messagesByGroup[item.id]?.[0]?.createdAt}
                isLast={index === myGroups.length - 1}
              />
            </View>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListFooterComponent={myGroups.length > 0 ? <View style={styles.cardBottom} /> : null}
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
  list: { paddingBottom: Spacing[10] },
  groupWrapper: {
    backgroundColor: '#ffffff',
    marginHorizontal: Spacing[3],
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#d8d3cb',
  },
  groupWrapperFirst: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  emptyScroll: { paddingBottom: Spacing[10] },
  emptyCta: { paddingHorizontal: Spacing[5], paddingTop: Spacing[4] },
  suggestedSection: { marginTop: Spacing[2] },
  suggestedCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: Spacing[3],
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d8d3cb',
    overflow: 'hidden',
  },
  suggestedRow: {},
  suggestedRowFirst: {},
});
