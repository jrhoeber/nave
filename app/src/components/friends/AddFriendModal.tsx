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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../ui/Avatar';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import { api, mapFriendSearchResult } from '../../lib/apiClient';
import type { FriendSearchResult } from '../../types';

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestSent?: () => void;
}

export function AddFriendModal({ visible, onClose, onRequestSent }: AddFriendModalProps) {
  const insets = useSafeAreaInsets();
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
      // If already friends / pending, reflect in UI
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
      return item.isRequester ? 'Requested' : 'Accepts you';
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

    return (
      <View style={styles.userCard}>
        <Avatar uri={item.avatarUrl} name={item.displayName} size={46} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.userHandle}>@{item.username}</Text>
          {item.parish && (
            <View style={styles.parishRow}>
              <Icon name="business-outline" size={11} color={Colors.textLight} />
              <Text style={styles.userParish} numberOfLines={1}>{item.parish}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.addBtn,
            variant === 'outline' && styles.addBtnOutline,
            variant === 'ghost' && styles.addBtnGhost,
            disabled && styles.addBtnDisabled,
          ]}
          onPress={() => handleAdd(item)}
          disabled={disabled}
          activeOpacity={0.75}
        >
          {isLoading
            ? <ActivityIndicator size="small" color={Colors.textInverse} />
            : <Text style={[
                styles.addBtnLabel,
                variant === 'outline' && styles.addBtnLabelOutline,
                variant === 'ghost' && styles.addBtnLabelGhost,
              ]}>{label}</Text>
          }
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Add Friend</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={17} color={Colors.textSecondary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Name, username, or email..."
            placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={17} color={Colors.textLight} />
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
          ListEmptyComponent={
            !searching && query.trim().length > 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No users found for "{query}"</Text>
              </View>
            ) : !query.trim() ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>Find Catholics to connect with</Text>
                <Text style={styles.emptySubtitle}>Search by name, username, or email address</Text>
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
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  cancelText: { fontSize: Typography.base, color: Colors.textSecondary, width: 60 },
  toolbarTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, margin: Spacing[4], borderRadius: Radius.md, paddingHorizontal: Spacing[3], borderWidth: 1.5, borderColor: Colors.border, gap: Spacing[2] },
  searchInput: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary, paddingVertical: Spacing[3] },
  loader: { marginTop: Spacing[4] },
  list: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[10] },
  userCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing[3], flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[3], ...Shadows.sm },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  userHandle: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },
  parishRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: Spacing[1] },
  userParish: { fontSize: Typography.xs, color: Colors.textLight, flexShrink: 1 },
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.full, minWidth: 72, alignItems: 'center' },
  addBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  addBtnGhost: { backgroundColor: Colors.surfaceAlt, borderWidth: 0 },
  addBtnDisabled: { opacity: 0.6 },
  addBtnLabel: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textInverse },
  addBtnLabelOutline: { color: Colors.primary },
  addBtnLabelGhost: { color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingVertical: Spacing[12], paddingHorizontal: Spacing[6] },
  emptyIcon: { fontSize: 44, marginBottom: Spacing[4] },
  emptyTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing[2] },
  emptySubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
  emptyText: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center' },
});
