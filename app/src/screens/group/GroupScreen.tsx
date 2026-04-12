import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrayerGroupCard } from '../../components/prayer/PrayerGroupCard';
import { EditPrayerGroupModal } from '../../components/prayer/EditPrayerGroupModal';
import { AddGroupModal } from '../../components/prayer/AddGroupModal';
import { usePrayerStore } from '../../store/prayerStore';
import { useGroupChatStore } from '../../store/groupChatStore';
import { Colors, Spacing, Typography } from '../../theme';
import type { PrayerGroup } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

export function GroupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const { myGroups, isLoading, fetchGroups, joinGroup, leaveGroup, deleteGroup } = usePrayerStore();
  const getUnreadCount = useGroupChatStore((s) => s.getUnreadCount);
  const [editingGroup, setEditingGroup] = useState<PrayerGroup | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);

  useEffect(() => { fetchGroups(); }, []);

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
            onPress={(id) => navigation.navigate('GroupDetail', { id })}
            onJoin={joinGroup}
            onLeave={leaveGroup}
            onEdit={(id) => setEditingGroup(myGroups.find((g) => g.id === id) ?? null)}
            onDelete={deleteGroup}
            unreadCount={getUnreadCount(item.id)}
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
        onOpenGroup={(id) => navigation.navigate('GroupDetail', { id })}
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
