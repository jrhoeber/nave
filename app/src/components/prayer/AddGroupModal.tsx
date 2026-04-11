import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../ui/Avatar';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import { api, mapPrayerGroup } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { usePrayerStore } from '../../store/prayerStore';
import type { PrayerGroup } from '../../types';

interface AddGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateGroup: () => void;
  onJoinGroup: (id: string) => void;
  onOpenGroup: (id: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  rosary: '📿',
  scripture_study: '📖',
  mens_group: '🛡️',
  womens_group: '🌸',
  youth: '😊',
  young_adults: '🙌',
  families: '🏠',
  devotional: '❤️',
  general: '💬',
};

function GroupRow({ group, onPress, onJoin }: { group: PrayerGroup; onPress: () => void; onJoin: () => void }) {
  return (
    <TouchableOpacity style={styles.groupRow} onPress={onPress} activeOpacity={0.7}>
      <Avatar name={group.name} size={44} uri={group.avatarUrl} />
      <View style={styles.groupInfo}>
        <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
        <Text style={styles.groupMeta} numberOfLines={1}>
          {CATEGORY_ICONS[group.category]} {group.memberCount.toLocaleString()} members
          {group.meetingSchedule ? `  ·  ${group.meetingSchedule}` : ''}
        </Text>
      </View>
      {!group.isMember && (
        <View onStartShouldSetResponder={() => true}>
          <TouchableOpacity
            style={[styles.joinBtn, group.isPendingApproval && styles.joinBtnPending]}
            onPress={onJoin}
            disabled={group.isPendingApproval}
          >
            <Text style={[styles.joinBtnText, group.isPendingApproval && styles.joinBtnTextPending]}>
              {group.isPendingApproval ? 'Requested' : 'Join'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {group.isMember && (
        <Icon name="checkmark-circle" size={20} color={Colors.success} />
      )}
    </TouchableOpacity>
  );
}

export function AddGroupModal({ visible, onClose, onCreateGroup, onJoinGroup, onOpenGroup }: AddGroupModalProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { joinGroup } = usePrayerStore();

  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<PrayerGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parishName = user?.parish;

  const fetchGroups = useCallback(async (query: string) => {
    if (!parishName) return;
    setLoading(true);
    try {
      const data = await api.searchParishGroups(parishName, query || undefined);
      setGroups(data.groups.map(mapPrayerGroup));
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [parishName]);

  // Initial load
  useEffect(() => {
    if (visible && parishName) {
      setSearch('');
      fetchGroups('');
    }
  }, [visible, parishName]);

  // Debounced search
  const handleSearch = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchGroups(text), 300);
  };

  const handleJoin = async (id: string) => {
    await joinGroup(id);
    // Refresh to reflect new membership status
    fetchGroups(search);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.container, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Group</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={16} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={handleSearch}
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Create new group row */}
        <TouchableOpacity
          style={styles.createRow}
          onPress={() => { onClose(); onCreateGroup(); }}
          activeOpacity={0.7}
        >
          <View style={styles.createIcon}>
            <Icon name="people-outline" size={22} color={Colors.textInverse} />
          </View>
          <View style={styles.createInfo}>
            <Text style={styles.createLabel}>Create New Group</Text>
            <Text style={styles.createSub}>Start a prayer group for your parish</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Parish groups list */}
        {!parishName ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⛪</Text>
            <Text style={styles.emptyTitle}>Join a parish to see groups</Text>
            <Text style={styles.emptySubtitle}>Set your parish in your profile to discover local prayer groups.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionHeader}>
              {search.length > 0 ? 'Results' : `Groups at ${parishName}`}
            </Text>
            {loading ? (
              <ActivityIndicator style={styles.spinner} color={Colors.primary} />
            ) : (
              <FlatList
                data={groups}
                keyExtractor={(g) => g.id}
                renderItem={({ item }) => (
                  <GroupRow
                    group={item}
                    onPress={() => { onClose(); onOpenGroup(item.id); }}
                    onJoin={() => handleJoin(item.id)}
                  />
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <Text style={styles.noResults}>
                    {search.length > 0 ? 'No groups match your search.' : 'No public groups found for your parish yet.'}
                  </Text>
                }
              />
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  title: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textPrimary },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing[4],
    paddingHorizontal: Spacing[3],
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 44,
    gap: Spacing[2],
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },

  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
    backgroundColor: Colors.surface,
  },
  createIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createInfo: { flex: 1 },
  createLabel: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  createSub: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },

  divider: { height: 1, backgroundColor: Colors.border, marginTop: Spacing[2] },

  sectionHeader: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },

  spinner: { marginTop: Spacing[8] },

  list: { paddingBottom: Spacing[10] },

  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  groupInfo: { flex: 1, minWidth: 0 },
  groupName: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  groupMeta: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },

  joinBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  joinBtnPending: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border },
  joinBtnText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textInverse },
  joinBtnTextPending: { color: Colors.textSecondary },

  emptyState: { alignItems: 'center', paddingVertical: Spacing[16], paddingHorizontal: Spacing[8] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing[4] },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[2], textAlign: 'center' },
  emptySubtitle: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: Typography.base * 1.5 },

  noResults: { textAlign: 'center', color: Colors.textSecondary, fontSize: Typography.base, paddingTop: Spacing[8] },
});
