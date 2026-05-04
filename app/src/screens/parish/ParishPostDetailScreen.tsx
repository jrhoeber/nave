import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Avatar } from '../../components/ui/Avatar';
import { ParishPostCard } from '../../components/parish/ParishPostCard';
import { useAuthStore } from '../../store/authStore';
import { api, ApiError, mapParishComment, mapParishPost } from '../../lib/apiClient';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import type { ParishComment, ParishPost, ParishReactionType } from '../../types';
import type { ParishPostDetailRouteProp, RootNavigationProp } from '../../types/navigation';

export function ParishPostDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<ParishPostDetailRouteProp>();
  const { parishId, postId } = route.params;

  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id;

  // Post state
  const [post, setPost] = useState<ParishPost | null>(null);
  const [isParishAdmin, setIsParishAdmin] = useState(false);

  // Comments state
  const [comments, setComments] = useState<ParishComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  // Compose state
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Edit state
  const [editingComment, setEditingComment] = useState<ParishComment | null>(null);

  // Fetch post
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getParishPosts(parishId);
        const found = data.posts.find((p) => p.id === postId);
        if (found) setPost(mapParishPost(found));
        const parish = await api.getParish(parishId);
        setIsParishAdmin(parish.is_parish_admin ?? false);
      } catch {}
    })();
  }, [parishId, postId]);

  // Fetch comments
  const fetchComments = useCallback(async (cursor?: string) => {
    try {
      const data = await api.getParishPostComments(parishId, postId, cursor);
      const mapped = data.comments.map(mapParishComment);
      if (cursor) {
        setComments((prev) => [...prev, ...mapped]);
      } else {
        setComments(mapped);
      }
      setTotalCount(data.total_count);
      setNextCursor(data.next_cursor);
    } catch {}
  }, [parishId, postId]);

  useEffect(() => {
    setLoadingComments(true);
    fetchComments().finally(() => setLoadingComments(false));
  }, [fetchComments]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    await fetchComments(nextCursor);
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [fetchComments, nextCursor]);

  const handleRefresh = useCallback(async () => {
    await fetchComments();
    // Also refresh post for updated comment count
    try {
      const data = await api.getParishPosts(parishId);
      const found = data.posts.find((p) => p.id === postId);
      if (found) setPost(mapParishPost(found));
    } catch {}
  }, [fetchComments, parishId, postId]);

  // Submit comment
  const handleSubmit = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      if (editingComment) {
        const raw = await api.updateParishPostComment(parishId, postId, editingComment.id, trimmed);
        const updated = mapParishComment(raw);
        setComments((prev) => prev.map((c) => c.id === updated.id ? updated : c));
        setEditingComment(null);
      } else {
        const raw = await api.createParishPostComment(parishId, postId, trimmed);
        const created = mapParishComment(raw);
        if (created.status === 'Posted') {
          setComments((prev) => [...prev, created]);
          setTotalCount((c) => c + 1);
          if (post) setPost({ ...post, commentCount: post.commentCount + 1 });
        }
      }
      setCommentText('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to post comment.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete comment
  const handleDeleteComment = useCallback(async (comment: ParishComment) => {
    // Find replies to this comment for cascade
    const replyIds = comments.filter((c) => c.replyToId === comment.id).map((c) => c.id);
    const idsToRemove = [comment.id, ...replyIds];
    const removedCount = idsToRemove.length;

    setComments((prev) => prev.filter((c) => !idsToRemove.includes(c.id)));
    setTotalCount((c) => c - removedCount);
    if (post) setPost({ ...post, commentCount: Math.max(0, post.commentCount - removedCount) });

    try {
      await api.deleteParishPostComment(parishId, postId, comment.id);
    } catch {
      // Restore on failure
      await fetchComments();
    }
  }, [parishId, postId, comments, post, fetchComments]);

  // Report comment
  const handleReportComment = useCallback((comment: ParishComment) => {
    const reasons = [
      { text: 'Spam', value: 'spam' },
      { text: 'Harassment', value: 'harassment' },
      { text: 'Hate Speech', value: 'hate_speech' },
      { text: 'Inappropriate', value: 'inappropriate' },
      { text: 'Misinformation', value: 'misinformation' },
      { text: 'Other', value: 'other' },
    ];
    Alert.alert(
      'Report Comment',
      'Why are you reporting this?',
      [
        ...reasons.map((r) => ({
          text: r.text,
          onPress: async () => {
            try {
              await api.reportContent('comment', comment.id, r.value);
              Alert.alert('Report Submitted', 'Thank you. Our team will review this.');
            } catch (err) {
              if (err instanceof ApiError && err.status === 409) {
                Alert.alert('Already Reported', "You've already reported this content.");
              } else {
                Alert.alert('Error', 'Could not submit report. Please try again.');
              }
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, []);

  // Toggle comment reaction
  const handleToggleCommentReaction = useCallback(async (commentId: string, reaction: ParishReactionType) => {
    // Optimistic update
    setComments((prev) => prev.map((c) => {
      if (c.id !== commentId) return c;
      const alreadyReacted = c.userReactions.includes(reaction);
      return {
        ...c,
        reactions: { ...c.reactions, [reaction]: (c.reactions[reaction] ?? 0) + (alreadyReacted ? -1 : 1) },
        userReactions: alreadyReacted
          ? c.userReactions.filter((r) => r !== reaction)
          : [...c.userReactions, reaction],
      };
    }));
    try {
      const raw = await api.toggleParishCommentReaction(parishId, postId, commentId, reaction);
      setComments((prev) => prev.map((c) =>
        c.id !== commentId ? c : {
          ...c,
          reactions: raw.reactions as Record<ParishReactionType, number>,
          userReactions: raw.user_reactions as ParishReactionType[],
        }
      ));
    } catch {
      // Rollback
      setComments((prev) => prev.map((c) => {
        if (c.id !== commentId) return c;
        const alreadyReacted = c.userReactions.includes(reaction);
        return {
          ...c,
          reactions: { ...c.reactions, [reaction]: (c.reactions[reaction] ?? 0) + (alreadyReacted ? -1 : 1) },
          userReactions: alreadyReacted
            ? c.userReactions.filter((r) => r !== reaction)
            : [...c.userReactions, reaction],
        };
      }));
    }
  }, [parishId, postId]);

  // Toggle post reaction (for the post card at top)
  const handleTogglePostReaction = useCallback(async (postId_: string, reaction: ParishReactionType) => {
    if (!post) return;
    const alreadyReacted = post.userReactions.includes(reaction);
    setPost({
      ...post,
      reactions: { ...post.reactions, [reaction]: (post.reactions[reaction] ?? 0) + (alreadyReacted ? -1 : 1) },
      userReactions: alreadyReacted
        ? post.userReactions.filter((r) => r !== reaction)
        : [...post.userReactions, reaction],
    });
    try {
      const raw = alreadyReacted
        ? await api.removeParishPostReaction(parishId, postId_, reaction)
        : await api.addParishPostReaction(parishId, postId_, reaction);
      setPost((prev) => prev ? {
        ...prev,
        reactions: raw.reactions as Record<ParishReactionType, number>,
        userReactions: raw.user_reactions as ParishReactionType[],
      } : prev);
    } catch {
      // Rollback
      setPost((prev) => prev ? {
        ...prev,
        reactions: { ...prev.reactions, [reaction]: (prev.reactions[reaction] ?? 0) + (alreadyReacted ? 1 : -1) },
        userReactions: alreadyReacted
          ? [...prev.userReactions, reaction]
          : prev.userReactions.filter((r) => r !== reaction),
      } : prev);
    }
  }, [parishId, post]);

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const handleCommentLongPress = useCallback((item: ParishComment) => {
    const isOwner = currentUserId === item.author.id;
    const isPostAuthor = currentUserId === post?.author.id;
    const canDelete = isOwner || isPostAuthor || isParishAdmin;

    const buttons: Array<{ text: string; onPress: () => void; style?: 'destructive' | 'cancel' }> = [];
    if (isOwner) {
      buttons.push({
        text: 'Edit',
        onPress: () => {
          setEditingComment(item);
          setCommentText(item.content);
          inputRef.current?.focus();
        },
      });
    }
    if (canDelete) {
      buttons.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeleteComment(item),
      });
    }
    if (!isOwner) {
      buttons.push({
        text: 'Report',
        style: 'destructive',
        onPress: () => handleReportComment(item),
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel', onPress: () => {} });

    Alert.alert(undefined as any, undefined as any, buttons);
  }, [currentUserId, post, isParishAdmin, handleDeleteComment, handleReportComment]);

  const renderComment = ({ item, index }: { item: ParishComment; index: number }) => {
    const isLast = index === comments.length - 1;
    const hasReacted = item.userReactions.length > 0;
    const heartCount = (item.reactions['❤️'] ?? 0) + (item.reactions['👍'] ?? 0);

    return (
      <View style={styles.commentSection}>
        {index > 0 && <View style={styles.commentDivider} />}
        <TouchableOpacity
          style={styles.commentCard}
          activeOpacity={0.7}
          onLongPress={() => handleCommentLongPress(item)}
          delayLongPress={400}
        >
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { id: item.author.id })} activeOpacity={0.7}>
            <Avatar name={item.author.displayName} size={40} uri={item.author.avatarUrl} />
          </TouchableOpacity>
          <View style={styles.commentBody}>
            <View style={styles.commentHeader}>
              <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { id: item.author.id })} activeOpacity={0.7}>
                <Text style={styles.commentAuthor}>{item.author.displayName}</Text>
              </TouchableOpacity>
              <Text style={styles.commentTime}>· {relativeTime(item.createdAt)}</Text>
              {item.updatedAt !== item.createdAt && (
                <Text style={styles.commentEdited}>(edited)</Text>
              )}
            </View>

            <Text style={styles.commentContent}>{item.content}</Text>

            <View style={styles.commentActions}>
              <TouchableOpacity
                style={[styles.heartChip, hasReacted && styles.heartChipActive]}
                onPress={() => handleToggleCommentReaction(item.id, hasReacted ? item.userReactions[0] : '❤️')}
                activeOpacity={0.6}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Icon
                  name={hasReacted ? 'heart' : 'heart-outline'}
                  size={14}
                  color={hasReacted ? '#dc2626' : Colors.textSecondary}
                />
                {heartCount > 0 && (
                  <Text style={[styles.heartCount, hasReacted && styles.heartCountActive]}>
                    {heartCount}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const listHeader = useMemo(() => (
    <>
      <View style={styles.postSection}>
        {post && (
          <ParishPostCard
            post={post}
            currentUserId={currentUserId}
            isParishAdmin={isParishAdmin}
            onEdit={() => {}}
            onDelete={() => navigation.goBack()}
            onReport={() => {}}
            onToggleReaction={handleTogglePostReaction}
            onAuthorPress={(userId) => navigation.navigate('UserProfile', { id: userId })}
          />
        )}
      </View>

      {/* Comments header — hide when empty */}
      {(totalCount > 0 || loadingComments) && (
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsLabel}>
            COMMENTS  •  {totalCount}
          </Text>
          <View style={styles.commentsHeaderLine} />
        </View>
      )}
      {loadingComments && (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing[4] }} />
      )}
    </>
  ), [post, currentUserId, isParishAdmin, handleTogglePostReaction, totalCount, loadingComments, navigation]);

  const listFooter = useMemo(() => (
    loadingMore ? <ActivityIndicator color={Colors.primary} style={styles.footerLoader} /> : null
  ), [loadingMore]);

  const authorFirstName = post?.author.displayName.split(' ')[0] ?? '';

  const listEmpty = useMemo(() => !loadingComments ? (
    <View style={styles.emptyComments}>
      <View style={styles.emptyDividerTop} />
      <Text style={styles.emptyTitle}>
        {'The pew is open.\nBe the first to greet ' + authorFirstName + '.'}
      </Text>
      <View style={styles.emptyDividerBottom} />
    </View>
  ) : null, [loadingComments, authorFirstName]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Icon name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Comments list */}
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onRefresh={handleRefresh}
        refreshing={false}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Compose bar */}
      <View style={[styles.composeBar, { paddingBottom: Math.max(insets.bottom, Spacing[2]) }]}>
        {editingComment && (
          <View style={styles.composeContext}>
            <Text style={styles.composeContextText}>Editing comment</Text>
            <TouchableOpacity
              onPress={() => {
                setEditingComment(null);
                setCommentText('');
              }}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Icon name="close" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composeRow}>
          <Avatar name={user?.displayName ?? ''} uri={user?.avatarUrl} size={36} />
          <View style={styles.inputOutline}>
            <TextInput
              ref={inputRef}
              style={styles.composeInput}
              placeholder="Write a comment..."
              placeholderTextColor={Colors.textLight}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!commentText.trim() || submitting}
            style={[styles.sendBtn, (!commentText.trim() || submitting) && styles.sendBtnDisabled]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Icon name="send" size={16} color={Colors.textInverse} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header — matches ParishScreen's warm background
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingBottom: Spacing[2],
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.18)',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },

  // List
  listContent: { paddingBottom: Spacing[10] },

  // Full-width white post section
  postSection: {
    backgroundColor: Colors.surface,
  },

  // Comments header
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[1],
    gap: Spacing[3],
  },
  commentsLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  commentsHeaderLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#b5b0a8',
  },

  footerLoader: { marginVertical: Spacing[4] },

  // Empty comments
  emptyComments: {
    paddingTop: 130,
    paddingHorizontal: Spacing[6],
    alignItems: 'center',
  },
  emptyDividerTop: {
    width: 32,
    height: 2,
    backgroundColor: Colors.accent,
    marginBottom: Spacing[4],
    borderRadius: 1,
  },
  emptyTitle: {
    fontFamily: 'Cormorant Garamond',
    fontStyle: 'italic',
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
  },
  emptyDividerBottom: {
    width: 20,
    height: 2,
    backgroundColor: Colors.accent,
    marginTop: Spacing[4],
    marginBottom: Spacing[4],
    borderRadius: 1,
  },
  emptySubtitle: {
    fontSize: Typography.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },


  commentSection: {},

  // Comment divider
  commentDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: Spacing[4],
  },

  // Comment card
  commentCard: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    gap: Spacing[3],
  },
  commentBody: { flex: 1 },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    marginBottom: Spacing[1],
  },
  commentAuthor: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  commentTime: {
    fontSize: Typography.sm,
    color: Colors.textLight,
  },
  commentEdited: {
    fontSize: Typography.xs,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  commentContent: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    lineHeight: Typography.base * 1.6,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[3],
    gap: Spacing[2],
  },
  heartChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heartChipActive: {},
  heartCount: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  heartCountActive: {
    color: '#dc2626',
  },

  // Compose bar
  composeBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: Spacing[3],
    paddingTop: Spacing[2],
  },
  composeContext: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    marginBottom: Spacing[1],
    backgroundColor: Colors.primary + '08',
    borderRadius: Radius.sm,
  },
  composeContextText: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: Typography.medium,
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing[2],
  },
  inputOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    minHeight: 36,
    justifyContent: 'center',
  },
  composeInput: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    maxHeight: 100,
    paddingVertical: Spacing[2],
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
