import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { api, mapParish, mapParishPost } from '../../lib/apiClient';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { Parish, ParishPost, ParishReactionType } from '../../types';

// ─── Parish profile modal ─────────────────────────────────────────────────────

function ParishProfileModal({ parish, visible, onClose, onChangeParish }: {
  parish: Parish | null;
  visible: boolean;
  onClose: () => void;
  onChangeParish: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <View style={profileStyles.container}>

        {!parish && (
          <View style={profileStyles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {parish && (
          <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={profileStyles.scroll}>

            {/* Hero */}
            <View style={profileStyles.hero}>
              <TouchableOpacity
                style={[profileStyles.closeBtn, { top: insets.top + 12 }]}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={20} color={Colors.textInverse} />
              </TouchableOpacity>

              <View style={profileStyles.heroInner}>
                <View style={profileStyles.churchIconRing}>
                  <MCIcon name="church" size={28} color={Colors.accent} />
                </View>
                <Text style={profileStyles.parishName}>{parish.name}</Text>
                <View style={profileStyles.goldRule} />
                <Text style={profileStyles.diocese}>{parish.diocese}</Text>
                {parish.established && (
                  <Text style={profileStyles.established}>Est. {parish.established}</Text>
                )}
                {parish.streetAddress && (
                  <Text style={profileStyles.address}>
                    {parish.streetAddress}{'\n'}{parish.city}, {parish.state}{parish.postalCode ? ` ${parish.postalCode}` : ''}
                  </Text>
                )}
              </View>

              <View style={profileStyles.memberPill}>
                <Icon name="people" size={13} color={Colors.accent} />
                <Text style={profileStyles.memberPillText}>{parish.memberCount} members</Text>
              </View>
            </View>

            {/* Mass Schedule */}
            <View style={profileStyles.section}>
              <View style={profileStyles.sectionHeader}>
                <View style={profileStyles.sectionAccent} />
                <Text style={profileStyles.sectionTitle}>Mass Schedule</Text>
              </View>
              {parish.massSchedule && parish.massSchedule.length > 0 ? (
                <View style={profileStyles.scheduleCard}>
                  {parish.massSchedule.map((entry, i) => (
                    <View
                      key={entry.day}
                      style={[
                        profileStyles.massRow,
                        i === parish.massSchedule!.length - 1 && profileStyles.massRowLast,
                      ]}
                    >
                      <Text style={profileStyles.massDay}>{entry.day}</Text>
                      <View style={profileStyles.massDot} />
                      <Text style={profileStyles.massTime}>{entry.times.join('  ·  ')}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={profileStyles.emptySchedule}>
                  <Icon name="globe-outline" size={16} color={Colors.textLight} />
                  <Text style={profileStyles.massEmptyText}>Visit parish website for mass schedule</Text>
                </View>
              )}
            </View>

            {/* Change Parish */}
            <TouchableOpacity style={profileStyles.changeBtn} onPress={onChangeParish} activeOpacity={0.7}>
              <Icon name="swap-horizontal-outline" size={15} color={Colors.error} />
              <Text style={profileStyles.changeBtnText}>Change Parish</Text>
            </TouchableOpacity>

          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Compose modal ────────────────────────────────────────────────────────────

function ComposeModal({ parishId, visible, onClose, onCreated, onUpdated, editPost }: {
  parishId: string;
  visible: boolean;
  onClose: () => void;
  onCreated: (post: ParishPost) => void;
  onUpdated: (post: ParishPost) => void;
  editPost?: ParishPost;
}) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setContent(editPost?.content ?? '');
  }, [editPost, visible]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      if (editPost) {
        const raw = await api.updateParishPost(parishId, editPost.id, trimmed);
        onUpdated(mapParishPost(raw));
      } else {
        const raw = await api.createParishPost(parishId, trimmed);
        onCreated(mapParishPost(raw));
      }
      onClose();
    } catch {
      // ignore — keep modal open so user can retry
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setContent('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[composeStyles.container, { paddingTop: insets.top || Spacing[4] }]}>

          {/* Header */}
          <View style={composeStyles.header}>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={composeStyles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={composeStyles.title}>{editPost ? 'Edit Post' : 'New Post'}</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!content.trim() || submitting}
              style={[composeStyles.postBtn, (!content.trim() || submitting) && composeStyles.postBtnDisabled]}
            >
              {submitting
                ? <ActivityIndicator size="small" color={Colors.textInverse} />
                : <Text style={composeStyles.postBtnText}>{editPost ? 'Save' : 'Post'}</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={composeStyles.divider} />

          {/* Author row */}
          <View style={composeStyles.authorRow}>
            <Avatar name={user?.displayName ?? ''} uri={user?.avatarUrl} size={40} />
            <Text style={composeStyles.authorName}>{user?.displayName}</Text>
          </View>

          {/* Text input */}
          <TextInput
            style={composeStyles.input}
            placeholder="Share something with your parish…"
            placeholderTextColor={Colors.textLight}
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
            maxLength={1000}
            textAlignVertical="top"
          />

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────

const REACTION_EMOJIS: ParishReactionType[] = ['👍', '🙏', '❤️'];

function ReactionBar({ post, onToggleReaction }: {
  post: ParishPost;
  onToggleReaction: (postId: string, reaction: ParishReactionType) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const existing = REACTION_EMOJIS.filter((e) => (post.reactions[e] ?? 0) > 0);

  return (
    <View style={styles.reactionBar}>
      {existing.map((emoji) => {
        const active = post.userReactions.includes(emoji);
        return (
          <TouchableOpacity
            key={emoji}
            style={[styles.reactionBtn, active && styles.reactionBtnActive]}
            onPress={() => { onToggleReaction(post.id, emoji); setPickerOpen(false); }}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            <Text style={[styles.reactionCount, active && styles.reactionCountActive]}>
              {post.reactions[emoji]}
            </Text>
          </TouchableOpacity>
        );
      })}

      {pickerOpen ? (
        REACTION_EMOJIS.filter((e) => !post.userReactions.includes(e)).map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={styles.reactionBtn}
            onPress={() => { onToggleReaction(post.id, emoji); setPickerOpen(false); }}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <TouchableOpacity
          style={styles.reactionAddBtn}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Icon name="happy-outline" size={13} color={Colors.textLight} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function PostCard({ post, currentUserId, isMenuOpen, onMenuOpen, onMenuClose, onEdit, onDelete, onToggleReaction }: {
  post: ParishPost;
  currentUserId?: string;
  isMenuOpen: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onEdit: (post: ParishPost) => void;
  onDelete: (post: ParishPost) => void;
  onToggleReaction: (postId: string, reaction: ParishReactionType) => void;
}) {
  const isOwner = currentUserId === post.author.id;

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Avatar name={post.author.displayName} size={36} uri={post.author.avatarUrl} />
        <View style={styles.postMeta}>
          <Text style={styles.postAuthor}>{post.author.displayName}</Text>
          <Text style={styles.postTime}>{relativeTime(post.createdAt)}</Text>
        </View>
        {isOwner && (
          <View style={{ alignSelf: 'flex-start' }}>
            <TouchableOpacity
              onPress={isMenuOpen ? onMenuClose : onMenuOpen}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="ellipsis-horizontal" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
            {isMenuOpen && (
              <View style={styles.kebabMenu}>
                <TouchableOpacity
                  style={styles.kebabItem}
                  onPress={() => { onMenuClose(); onEdit(post); }}
                >
                  <Icon name="pencil-outline" size={15} color={Colors.textPrimary} />
                  <Text style={styles.kebabItemText}>Edit</Text>
                </TouchableOpacity>
                <View style={styles.kebabDivider} />
                <TouchableOpacity
                  style={styles.kebabItem}
                  onPress={() => { onMenuClose(); onDelete(post); }}
                >
                  <Icon name="trash-outline" size={15} color={Colors.error} />
                  <Text style={[styles.kebabItemText, styles.kebabItemDelete]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
      <Text style={styles.postContent}>{post.content}</Text>
      <ReactionBar post={post} onToggleReaction={onToggleReaction} />
    </View>
  );
}

// ─── Parish feed view ─────────────────────────────────────────────────────────

function ParishFeed({ parishId, parishName, onChangeParish }: {
  parishId: string;
  parishName: string;
  onChangeParish: () => void;
}) {
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [profileVisible, setProfileVisible] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<ParishPost | undefined>();
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [parish, setParish] = useState<Parish | null>(null);

  const [posts, setPosts] = useState<ParishPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const hasMore = useRef(true);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    api.getParish(parishId)
      .then((data) => setParish(mapParish(data)))
      .catch(() => {});
  }, [parishId]);

  const fetchPosts = useCallback(async (cursor?: string) => {
    try {
      const data = await api.getParishPosts(parishId, cursor);
      console.log('[fetchPosts] posts:', data.posts.length, 'next_cursor:', data.next_cursor);
      const mapped = data.posts.map(mapParishPost);
      if (cursor) {
        setPosts((prev) => [...prev, ...mapped]);
      } else {
        setPosts(mapped);
      }
      setNextCursor(data.next_cursor);
      if (!data.next_cursor) {
        hasMore.current = false;
      }
    } catch (e) {
      console.log('[fetchPosts] error:', e);
    }
  }, [parishId]);

  useEffect(() => {
    setLoadingPosts(true);
    hasMore.current = true;
    fetchPosts().finally(() => setLoadingPosts(false));
  }, [fetchPosts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    hasMore.current = true;
    await fetchPosts();
    setRefreshing(false);
  }, [fetchPosts]);

  const handleLoadMore = useCallback(async () => {
    console.log('[loadMore] fired — hasMore:', hasMore.current, 'loading:', loadingMoreRef.current, 'cursor:', nextCursor);
    if (!hasMore.current || loadingMoreRef.current || !nextCursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    await fetchPosts(nextCursor);
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [fetchPosts, nextCursor]);

  const handleToggleReaction = useCallback(async (postId: string, reaction: ParishReactionType) => {
    const parishId_ = parishId;
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const alreadyReacted = p.userReactions.includes(reaction);
      return {
        ...p,
        reactions: { ...p.reactions, [reaction]: (p.reactions[reaction] ?? 0) + (alreadyReacted ? -1 : 1) },
        userReactions: alreadyReacted
          ? p.userReactions.filter((r) => r !== reaction)
          : [...p.userReactions, reaction],
      };
    }));
    try {
      const snapshot = posts.find((p) => p.id === postId);
      const alreadyReacted = snapshot?.userReactions.includes(reaction) ?? false;
      const raw = alreadyReacted
        ? await api.removeParishPostReaction(parishId_, postId, reaction)
        : await api.addParishPostReaction(parishId_, postId, reaction);
      setPosts((prev) => prev.map((p) =>
        p.id !== postId ? p : {
          ...p,
          reactions: raw.reactions as Record<ParishReactionType, number>,
          userReactions: raw.user_reactions as ParishReactionType[],
        }
      ));
    } catch {
      // roll back
      setPosts((prev) => prev.map((p) => {
        if (p.id !== postId) return p;
        const alreadyReacted = p.userReactions.includes(reaction);
        return {
          ...p,
          reactions: { ...p.reactions, [reaction]: (p.reactions[reaction] ?? 0) + (alreadyReacted ? -1 : 1) },
          userReactions: alreadyReacted
            ? p.userReactions.filter((r) => r !== reaction)
            : [...p.userReactions, reaction],
        };
      }));
    }
  }, [parishId, posts]);

  const handleEdit = useCallback((post: ParishPost) => {
    setEditingPost(post);
    setComposeVisible(true);
  }, []);

  const handleDelete = useCallback(async (post: ParishPost) => {
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    try {
      await api.deleteParishPost(parishId, post.id);
    } catch {
      // restore on failure
      setPosts((prev) => {
        const idx = prev.findIndex((p) => p.createdAt < post.createdAt);
        const next = [...prev];
        next.splice(idx === -1 ? prev.length : idx, 0, post);
        return next;
      });
    }
  }, [parishId]);

  const ListHeader = useCallback(() => (
    <View>
      {parish?.coverPhotoUrl ? (
        <Image source={{ uri: parish.coverPhotoUrl }} style={styles.coverPhoto} resizeMode="cover" />
      ) : (
        <View style={styles.coverPhotoPlaceholder}>
          <MCIcon name="church" size={48} color={Colors.primary + '60'} />
        </View>
      )}
      <View style={styles.parishIdentity}>
        <View style={styles.parishIdentityText}>
          <Text style={styles.parishName} numberOfLines={2}>{parishName}</Text>
          {parish?.established && (
            <Text style={styles.parishEstablished}>Est. {parish.established}</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setProfileVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="information-circle-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />
      {loadingPosts && (
        <ActivityIndicator color={Colors.primary} style={styles.initialLoader} />
      )}
    </View>
  ), [parish, parishName, loadingPosts]);

  const ListFooter = useCallback(() => loadingMore ? (
    <ActivityIndicator color={Colors.primary} style={styles.footerLoader} />
  ) : null, [loadingMore]);

  const ListEmpty = useCallback(() => !loadingPosts ? (
    <View style={styles.emptyState}>
      <Icon name="chatbubble-outline" size={32} color={Colors.textLight} />
      <Text style={styles.emptyText}>No posts yet</Text>
    </View>
  ) : null, [loadingPosts]);

  const renderItem = ({ item }: ListRenderItemInfo<ParishPost>) => (
    <PostCard
      post={item}
      currentUserId={currentUserId}
      isMenuOpen={openMenuPostId === item.id}
      onMenuOpen={() => setOpenMenuPostId(item.id)}
      onMenuClose={() => setOpenMenuPostId(null)}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onToggleReaction={handleToggleReaction}
    />
  );
  const keyExtractor = (item: ParishPost) => item.id;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        style={{ flex: 1 }}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onScrollBeginDrag={() => setOpenMenuPostId(null)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedScroll}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + Spacing[5] }]}
        onPress={() => { setEditingPost(undefined); setComposeVisible(true); }}
        activeOpacity={0.85}
      >
        <Icon name="add" size={26} color={Colors.textInverse} />
      </TouchableOpacity>

      <ParishProfileModal
        parish={parish}
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        onChangeParish={onChangeParish}
      />

      <ComposeModal
        parishId={parishId}
        visible={composeVisible}
        editPost={editingPost}
        onClose={() => { setComposeVisible(false); setEditingPost(undefined); }}
        onCreated={(post) => setPosts((prev) => [post, ...prev])}
        onUpdated={(updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p))}
      />
    </View>
  );
}

// ─── Parish search / select view ──────────────────────────────────────────────

function ParishSelect({ onSelect }: { onSelect: (parish: Parish) => void }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Parish[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchParishes(q);
        setResults(data.parishes.map(mapParish));
      } catch {
        // ignore search errors
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    search(query);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.selectHeader}>
        <MCIcon name="church" size={32} color={Colors.primary} style={styles.selectIcon} />
        <Text style={styles.selectTitle}>Parish</Text>
        <Text style={styles.selectSubtitle}>Select a parish to connect with your community</Text>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, city..."
            placeholderTextColor={Colors.textLight}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {results.length > 0 && (
          <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {results.map((parish, index) => (
              <TouchableOpacity
                key={parish.id}
                style={[styles.resultRow, index === results.length - 1 && styles.resultRowLast]}
                onPress={() => onSelect(parish)}
                activeOpacity={0.75}
              >
                <Avatar name={parish.name} size={40} />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{parish.name}</Text>
                  <Text style={styles.resultLocation}>{parish.city}, {parish.state}</Text>
                </View>
                <View style={styles.resultMeta}>
                  <Icon name="people-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.resultCount}>{parish.memberCount}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {query.length === 0 && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome to Nave!</Text>
            <Text style={styles.welcomeSubtitle}>Join a parish to stay connected</Text>
          </View>
        )}

        {query.length > 1 && !loading && results.length === 0 && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No parishes found for "{query}"</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function CommunityScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [selecting, setSelecting] = useState(false);

  const handleSelect = async (parish: Parish) => {
    try {
      await api.updateProfile({ parish_id: parish.id });
    } catch {
      // continue — update local state regardless
    }
    await updateUser({ parishId: parish.id, parish: parish.name });
  };

  const handleChangeParish = async () => {
    try {
      await api.updateProfile({ parish_id: undefined });
    } catch {
      // continue — clear local state regardless
    }
    await updateUser({ parishId: undefined, parish: undefined });
    setSelecting(true);
  };

  if (!user?.parishId || selecting) {
    return (
      <ParishSelect
        onSelect={(parish) => {
          handleSelect(parish);
          setSelecting(false);
        }}
      />
    );
  }

  return (
    <ParishFeed
      parishId={user.parishId}
      parishName={user.parish ?? user.parishId}
      onChangeParish={handleChangeParish}
    />
  );
}

// ─── Feed styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  coverPhoto: {
    width: '100%',
    height: 180,
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parishIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[3],
  },
  parishIdentityText: { flex: 1 },
  parishName: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  parishEstablished: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.medium, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing[5] },

  feedScroll: { paddingBottom: Spacing[10] },
  initialLoader: { marginTop: Spacing[8] },
  footerLoader: { marginVertical: Spacing[4] },

  postCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    ...Shadows.sm,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[3], gap: Spacing[3] },
  postMeta: { flex: 1 },
  postAuthor: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  postTime: { fontSize: Typography.xs, color: Colors.textLight, marginTop: 1 },
  postContent: { fontSize: Typography.base, color: Colors.textPrimary, lineHeight: Typography.base * 1.5 },

  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[3],
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  reactionBtnActive: {
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '12',
  },
  reactionAddBtn: {
    padding: 4,
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  reactionCountActive: {
    color: Colors.primary,
  },

  emptyState: { alignItems: 'center', paddingTop: Spacing[10], gap: Spacing[3] },
  emptyText: { fontSize: Typography.base, color: Colors.textLight },

  kebabMenu: {
    position: 'absolute',
    top: 24,
    right: 0,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 130,
    zIndex: 100,
    ...Shadows.md,
  },
  kebabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
  },
  kebabItemText: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  kebabItemDelete: {
    color: Colors.error,
  },
  kebabDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },

  fab: {
    position: 'absolute',
    right: Spacing[5],
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },

  selectHeader: {
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[8],
    paddingBottom: Spacing[6],
    alignItems: 'center',
  },
  selectIcon: { marginBottom: Spacing[3] },
  selectTitle: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[2],
  },
  selectSubtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.base * 1.5,
  },

  searchWrapper: { flex: 1, paddingHorizontal: Spacing[4] },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing[2],
  },
  searchIcon: { marginRight: Spacing[2] },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    paddingVertical: Spacing[3],
  },

  resultsList: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultRowLast: { borderBottomWidth: 0 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  resultLocation: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 1 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  resultCount: { fontSize: Typography.xs, color: Colors.textSecondary },
  welcomeContainer: { alignItems: 'center', paddingTop: Spacing[8] },
  welcomeTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[2] },
  welcomeSubtitle: { fontSize: Typography.base, color: Colors.textSecondary },

  noResults: { paddingVertical: Spacing[5], alignItems: 'center' },
  noResultsText: { fontSize: Typography.sm, color: Colors.textSecondary },
});

// ─── Profile modal styles ─────────────────────────────────────────────────────

const profileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: Spacing[12] },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: Colors.primaryDark,
    paddingBottom: Spacing[6],
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing[5],
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInner: {
    alignItems: 'center',
    paddingTop: Spacing[16],
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[5],
  },
  churchIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: Colors.accent + '60',
    backgroundColor: Colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
  },
  parishName: {
    fontFamily: Typography.fontSerif,
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: Typography['3xl'] * 1.2,
    marginBottom: Spacing[4],
  },
  goldRule: {
    width: 48,
    height: 1.5,
    backgroundColor: Colors.accent,
    marginBottom: Spacing[4],
  },
  diocese: {
    fontSize: Typography.base,
    color: 'rgba(255,255,255,0.80)',
    letterSpacing: 0.3,
    marginBottom: Spacing[2],
    textAlign: 'center',
  },
  established: {
    fontSize: Typography.sm,
    color: Colors.accentLight,
    fontWeight: Typography.medium,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing[3],
  },
  address: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: Typography.sm * 1.7,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.accent + '60',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  memberPillText: {
    fontSize: Typography.sm,
    color: Colors.accentLight,
    fontWeight: Typography.medium,
  },

  // ── Mass Schedule ─────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[7],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scheduleCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  massRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing[3],
  },
  massRowLast: { borderBottomWidth: 0 },
  massDay: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.textPrimary,
    flex: 1,
  },
  massDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent + '80',
  },
  massTime: {
    fontSize: Typography.base,
    color: Colors.primary,
    fontWeight: Typography.semibold,
    textAlign: 'right',
  },
  emptySchedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[2],
  },
  massEmptyText: {
    fontSize: Typography.sm,
    color: Colors.textLight,
    fontStyle: 'italic',
  },

  // ── Change Parish ─────────────────────────────────────────────────────────
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    marginHorizontal: Spacing[5],
    marginTop: Spacing[8],
    paddingVertical: Spacing[3] + 2,
  },
  changeBtnText: {
    fontSize: Typography.sm,
    color: Colors.error,
    fontWeight: Typography.medium,
  },
});

// ─── Compose modal styles ─────────────────────────────────────────────────────

const composeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  cancel: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  postBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    minWidth: 60,
    alignItems: 'center',
  },
  postBtnDisabled: {
    opacity: 0.45,
  },
  postBtnText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
  },
  authorName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  input: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing[4],
    lineHeight: Typography.base * 1.6,
  },
});
