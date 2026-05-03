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

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestSent?: () => void;
}

export function AddFriendModal({ visible, onClose, onRequestSent }: AddFriendModalProps) {
  const navigation = useNavigation<RootNavigationProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setPendingIds(new Set());
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
    if (pendingIds.has(item.id)) return;
    setPendingIds((p) => new Set(p).add(item.id));
    try {
      await api.sendFriendRequest(item.id);
      setResults((prev) =>
        prev.map((u) =>
          u.id === item.id
            ? { ...u, friendshipStatus: 'pending', isRequester: true }
            : u,
        ),
      );
      onRequestSent?.();
    } catch (e: any) {
      setResults((prev) =>
        prev.map((u) =>
          u.id === item.id
            ? { ...u, friendshipStatus: 'pending', isRequester: true }
            : u,
        ),
      );
    } finally {
      setPendingIds((p) => { const next = new Set(p); next.delete(item.id); return next; });
    }
  };

  const friendshipLabel = (item: FriendSearchResult) => {
    if (item.friendshipStatus === 'accepted') return 'Friends';
    if (item.friendshipStatus === 'pending') {
      return item.isRequester ? 'Pending' : 'Accepts you';
    }
    return 'Add';
  };

  const renderResult = ({ item }: { item: FriendSearchResult }) => {
    const label = friendshipLabel(item);
    const canAdd = label === 'Add' && !pendingIds.has(item.id);
    const isLoading = pendingIds.has(item.id);
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
                  : <Text style={styles.addBtnLabel}>{label}</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.statusText}>{label}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SearchModal
      visible={visible}
      onClose={onClose}
      sectionHeader="ADD FRIEND"
      heroText={'Walk together\nin faith.'}
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
        ListFooterComponent={null}
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
    borderBottomColor: '#d8d3cb',
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
