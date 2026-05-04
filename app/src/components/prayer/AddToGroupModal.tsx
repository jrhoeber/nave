import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '../ui/Avatar';
import { SearchModal } from '../ui/SearchModal';
import { CardList, Colors, Spacing, Typography } from '../../theme';
import { api, mapFriendSearchResult } from '../../lib/apiClient';
import type { FriendSearchResult } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

interface Member {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface AddToGroupModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  existingMembers: Member[];
  onMemberAdded: (member: Member) => void;
}

export function AddToGroupModal({
  visible,
  onClose,
  groupId,
  existingMembers,
  onMemberAdded,
}: AddToGroupModalProps) {
  const navigation = useNavigation<RootNavigationProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [statusMap, setStatusMap] = useState<Map<string, string>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const existingMemberIds = new Set(existingMembers.map((m) => m.id));

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setStatusMap(new Map());
    }
  }, [visible]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.searchFriends(query.trim());
        setResults(res.users.map(mapFriendSearchResult));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query]);

  const handleAdd = async (item: FriendSearchResult) => {
    if (statusMap.get(item.id) === 'adding') return;
    setStatusMap((prev) => new Map(prev).set(item.id, 'adding'));
    try {
      const res = await api.addMember(groupId, item.id);
      setStatusMap((prev) => new Map(prev).set(item.id, res.status));
      if (res.status === 'member') {
        onMemberAdded({
          id: item.id,
          username: item.username,
          displayName: item.displayName,
          avatarUrl: item.avatarUrl,
        });
      }
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (msg.startsWith('Already')) {
        setStatusMap((prev) => new Map(prev).set(item.id, msg.replace('Already ', '')));
      } else {
        setStatusMap((prev) => { const next = new Map(prev); next.delete(item.id); return next; });
      }
    }
  };

  const getLabel = (item: FriendSearchResult): { text: string; canAdd: boolean } => {
    if (existingMemberIds.has(item.id)) return { text: 'Member', canAdd: false };
    const s = statusMap.get(item.id);
    if (s === 'member') return { text: 'Added', canAdd: false };
    if (s === 'invited') return { text: 'Invited', canAdd: false };
    if (s === 'pending') return { text: 'Pending', canAdd: false };
    if (s === 'adding') return { text: 'Invite', canAdd: false };
    return { text: 'Invite', canAdd: true };
  };

  const renderResult = ({ item }: { item: FriendSearchResult }) => {
    const { text, canAdd } = getLabel(item);
    const isLoading = statusMap.get(item.id) === 'adding';
    const isLast = results.indexOf(item) === results.length - 1;

    return (
      <View style={[CardList.item, results.indexOf(item) === 0 && CardList.itemFirst, isLast && CardList.itemLast]}>
        <TouchableOpacity
          style={[styles.userCard, isLast && styles.userCardLast]}
          onPress={() => { onClose(); navigation.navigate('UserProfile', { id: item.id }); }}
          activeOpacity={0.7}
        >
          <Avatar uri={item.avatarUrl} name={item.displayName} size={42} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.displayName}</Text>
            <Text style={styles.userMeta} numberOfLines={1}>
              @{item.username}{item.parish ? ` \u00B7 ${item.parish}` : ''}
            </Text>
          </View>
          {canAdd ? (
            <View onStartShouldSetResponder={() => true}>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleAdd(item)}
                activeOpacity={0.75}
              >
                {isLoading
                  ? <ActivityIndicator size="small" color={Colors.textPrimary} />
                  : <Text style={styles.addBtnLabel}>{text}</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.statusText}>{text}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SearchModal
      visible={visible}
      onClose={onClose}
      sectionHeader="INVITE"
      heroText={'Invite to your\ncommunity.'}
      searchPlaceholder="Search by name or username"
      query={query}
      onQueryChange={setQuery}
    >
      {searching && (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderResult}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !searching && query.trim().length > 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No users found for &ldquo;{query}&rdquo;</Text>
            </View>
          ) : null
        }
      />
    </SearchModal>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing[4] },
  list: { paddingBottom: Spacing[10] },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    gap: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardBorder,
  },
  userCardLast: { borderBottomWidth: 0 },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: 3 },
  userMeta: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },

  addBtn: { borderBottomWidth: 2, borderBottomColor: Colors.accent, paddingBottom: 2 },
  addBtnLabel: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  statusText: { fontSize: Typography.sm, color: Colors.textSecondary },

  empty: { alignItems: 'center', paddingVertical: Spacing[12], paddingHorizontal: Spacing[6] },
  emptyText: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center' },
});
