import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '../ui/Avatar';
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
  const inputRef = useRef<TextInput>(null);
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
    } else {
      setTimeout(() => inputRef.current?.focus(), 300);
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

  const friendshipVariant = (item: FriendSearchResult): 'primary' | 'outline' | 'ghost' => {
    if (item.friendshipStatus === 'accepted') return 'ghost';
    if (item.friendshipStatus === 'pending') return 'outline';
    return 'primary';
  };

  const renderResult = ({ item }: { item: FriendSearchResult }) => {
    const label = friendshipLabel(item);
    const variant = friendshipVariant(item);
    const disabled = label !== 'Add' || pendingIds.has(item.id);
    const isLoading = pendingIds.has(item.id);

    const isLast = results.indexOf(item) === results.length - 1;

    return (
      <View style={[CardList.item, results.indexOf(item) === 0 && CardList.itemFirst]}>
        <TouchableOpacity
          style={[styles.userCard, isLast && styles.userCardLast]}
          onPress={() => { onClose(); navigation.navigate('UserProfile', { id: item.id }); }}
          activeOpacity={0.7}
        >
          <Avatar uri={item.avatarUrl} name={item.displayName} size={42} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.displayName}</Text>
            <Text style={styles.userMeta} numberOfLines={1}>
              @{item.username}{item.parish ? ` · ${item.parish}` : ''}
            </Text>
          </View>
          {disabled ? (
            <Text style={styles.statusText}>{label}</Text>
          ) : (
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
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Dragger */}
        <View style={styles.draggerRow}>
          <View style={styles.dragger} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View />
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>ADD FRIEND</Text>
        <Text style={styles.heroText}>Walk together{'\n'}in faith.</Text>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={16} color={Colors.textSecondary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or username"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

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
          ListFooterComponent={results.length > 0 ? <View style={CardList.footer} /> : null}
          ListEmptyComponent={
            !searching && query.trim().length > 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No users found for "{query}"</Text>
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  draggerRow: {
    alignItems: 'center',
    paddingTop: Spacing[2],
    paddingBottom: Spacing[1],
  },
  dragger: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.border,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[1],
  },
  cancelText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: '#4b5563', paddingRight: Spacing[1] },

  sectionHeader: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
  },
  heroText: {
    fontFamily: 'CormorantGaramond-Bold',
    fontSize: 28,
    color: '#000000',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[1],
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing[5],
    marginTop: Spacing[3],
    marginBottom: Spacing[2],
    paddingBottom: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing[2],
  },
  searchInput: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary, paddingVertical: 0, height: 24 },

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
