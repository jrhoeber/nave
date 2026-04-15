import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrayerGroupCard } from '../../components/prayer/PrayerGroupCard';
import { EditPrayerGroupModal } from '../../components/prayer/EditPrayerGroupModal';
import { AddGroupModal } from '../../components/prayer/AddGroupModal';
import { usePrayerStore } from '../../store/prayerStore';
import { useGroupChatStore } from '../../store/groupChatStore';
import { api, mapGroupMessage } from '../../lib/apiClient';
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

  useEffect(() => {
    fetchGroups();
  }, []);

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
        <View>
          <Text style={styles.title}>Groups</Text>
          <Text style={styles.subtitle}>Pray together, grow together</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setAddModalVisible(true)} testID="groups-add-btn">
          <Icon name="add" size={22} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      <FlatList
        testID="groups-list"
        data={myGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: PrayerGroup }) => (
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
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchGroups} tintColor={Colors.primary} />}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🙏</Text>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to join or create a prayer group.</Text>
          </View>
        ) : null}
      />

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
        onOpenGroup={(id) => navigation.navigate('GroupMessage', { id })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[5], paddingVertical: Spacing[4], borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  createBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing[4], paddingBottom: Spacing[10] },
  empty: { alignItems: 'center', paddingVertical: Spacing[16], paddingHorizontal: Spacing[8] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing[4] },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[2] },
  emptySubtitle: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: Typography.base * Typography.normal },
});
