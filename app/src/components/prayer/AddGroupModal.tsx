import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { PrayerGroupCard } from './PrayerGroupCard';
import { SearchModal } from '../ui/SearchModal';
import { CardList, Colors, Spacing, Typography } from '../../theme';
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

export function AddGroupModal({ visible, onClose, onCreateGroup, onJoinGroup, onOpenGroup }: AddGroupModalProps) {
  const user = useAuthStore((s) => s.user);
  const { joinGroup, leaveGroup, deleteGroup } = usePrayerStore();

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

  useEffect(() => {
    if (visible && parishName) {
      setSearch('');
      fetchGroups('');
    }
  }, [visible, parishName]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchGroups(text), 300);
  };

  const handleJoin = async (id: string) => {
    const groupData = groups.find((g) => g.id === id);
    await joinGroup(id, groupData);
    fetchGroups(search);
  };

  const createRow = (
    <TouchableOpacity
      style={styles.createRow}
      onPress={() => { onClose(); onCreateGroup(); }}
      activeOpacity={0.7}
    >
      <View style={styles.createIcon}>
        <Icon name="add" size={22} color={Colors.textInverse} />
      </View>
      <View style={styles.createInfo}>
        <Text style={styles.createLabel}>Start a group</Text>
        <Text style={styles.createSub}>Name it, set a cadence, invite a few</Text>
      </View>
      <Icon name="chevron-forward" size={18} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SearchModal
      visible={visible}
      onClose={onClose}
      sectionHeader="JOIN A GROUP"
      heroText="Find your circle."
      searchPlaceholder="Search groups"
      query={search}
      onQueryChange={handleSearch}
      aboveSearch={createRow}
    >
      {!parishName ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{'\u26EA'}</Text>
          <Text style={styles.emptyTitle}>Join a parish to see groups</Text>
          <Text style={styles.emptySubtitle}>Set your parish in your profile to discover local prayer groups.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>
            {search.length > 0 ? 'RESULTS' : `AT ${parishName.toUpperCase()}`}
          </Text>
          {loading ? (
            <ActivityIndicator style={styles.spinner} color={Colors.primary} />
          ) : groups.length === 0 ? (
            <Text style={styles.noResults}>
              {search.length > 0 ? 'No groups match your search.' : 'No public groups found for your parish yet.'}
            </Text>
          ) : (
            <FlatList
              data={groups}
              keyExtractor={(g) => g.id}
              renderItem={({ item, index }) => (
                <View style={[CardList.item, index === 0 && CardList.itemFirst, index === groups.length - 1 && CardList.itemLast]}>
                  <PrayerGroupCard
                    group={item}
                    onPress={(id) => { onClose(); onOpenGroup(id); }}
                    onJoin={(id) => handleJoin(id)}
                    onLeave={leaveGroup}
                    onEdit={() => {}}
                    onDelete={deleteGroup}
                    isLast={index === groups.length - 1}
                  />
                </View>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              ListFooterComponent={null}
            />
          )}
        </>
      )}
    </SearchModal>
  );
}

const styles = StyleSheet.create({
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createInfo: { flex: 1 },
  createLabel: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  createSub: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },

  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
  },

  spinner: { marginTop: Spacing[8] },
  list: { paddingBottom: Spacing[10] },

  emptyState: { alignItems: 'center', paddingVertical: Spacing[16], paddingHorizontal: Spacing[8] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing[4] },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[2], textAlign: 'center' },
  emptySubtitle: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: Typography.base * 1.5 },

  noResults: { textAlign: 'center', color: Colors.textSecondary, fontSize: Typography.base, paddingTop: Spacing[8] },
});
