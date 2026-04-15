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
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  // Maps userId → 'member' | 'pending' | 'adding' (in-flight)
  const [statusMap, setStatusMap] = useState<Map<string, string>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const existingMemberIds = new Set(existingMembers.map((m) => m.id));

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setStatusMap(new Map());
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
      // If already a member/pending, reflect it
      const msg: string = e?.message ?? '';
      if (msg.startsWith('Already')) {
        setStatusMap((prev) => new Map(prev).set(item.id, msg.replace('Already ', '')));
      } else {
        setStatusMap((prev) => { const next = new Map(prev); next.delete(item.id); return next; });
      }
    }
  };

  const getButtonState = (item: FriendSearchResult): { label: string; variant: 'primary' | 'outline' | 'ghost'; disabled: boolean } => {
    if (existingMemberIds.has(item.id)) return { label: 'Member', variant: 'ghost', disabled: true };
    const s = statusMap.get(item.id);
    if (s === 'member') return { label: 'Added', variant: 'ghost', disabled: true };
    if (s === 'pending') return { label: 'Pending', variant: 'outline', disabled: true };
    if (s === 'adding') return { label: 'Add', variant: 'primary', disabled: true };
    return { label: 'Add', variant: 'primary', disabled: false };
  };

  const renderResult = ({ item }: { item: FriendSearchResult }) => {
    const { label, variant, disabled } = getButtonState(item);
    const isLoading = statusMap.get(item.id) === 'adding';

    return (
      <View style={styles.userCard}>
        <View style={styles.userCardLeft}>
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
          <Text style={styles.toolbarTitle}>Add Member</Text>
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
                <Text style={styles.emptyTitle}>Search for people to add</Text>
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
  userCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing[3], minWidth: 0 },
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
