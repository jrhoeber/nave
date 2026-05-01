import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
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
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

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
  const [replyingTo, setReplyingTo] = useState<{ id: string; displayName: string } | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Edit state
  const [editingComment, setEditingComment] = useState<ParishComment | null>(null);
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);

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
        const raw = await api.createParishPostComment(parishId, postId, trimmed, replyingTo?.id);
        const created = mapParishComment(raw);
        if (created.status === 'Posted') {
          setComments((prev) => [...prev, created]);
          setTotalCount((c) => c + 1);
          if (post) setPost({ ...post, commentCount: post.commentCount + 1 });
        }
      }
      setCommentText('');
      setReplyingTo(null);
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

  const renderComment = ({ item }: { item: ParishComment }) => {
    const isOwner = currentUserId === item.author.id;
    const isPostAuthor = currentUserId === post?.author.id;
    const canDelete = isOwner || isPostAuthor || isParishAdmin;

    return (
      <View style={styles.commentCard}>
        <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { id: item.author.id })} activeOpacity={0.7}>
          <Avatar name={item.author.displayName} size={32} uri={item.author.avatarUrl} />
        </TouchableOpacity>
        <View style={styles.commentBody}>
          <View style={styles.commentHeader}>
            <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { id: item.author.id })} activeOpacity={0.7}>
              <Text style={styles.commentAuthor}>{item.author.displayName}</Text>
            </TouchableOpacity>
            <Text style={styles.commentTime}>{relativeTime(item.createdAt)}</Text>
            {item.updatedAt !== item.createdAt && (
              <Text style={styles.commentEdited}>(edited)</Text>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => setOpenMenuCommentId(openMenuCommentId === item.id ? null : item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="ellipsis-horizontal" size={14} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          {openMenuCommentId === item.id && (
            <View style={styles.commentMenu}>
              {isOwner && (
                <TouchableOpacity
                  style={styles.commentMenuItem}
                  onPress={() => {
                    setOpenMenuCommentId(null);
                    setEditingComment(item);
                    setCommentText(item.content);
                    inputRef.current?.focus();
                  }}
                >
                  <Icon name="pencil-outline" size={14} color={Colors.textPrimary} />
                  <Text style={styles.commentMenuText}>Edit</Text>
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity
                  style={styles.commentMenuItem}
                  onPress={() => {
                    setOpenMenuCommentId(null);
                    handleDeleteComment(item);
                  }}
                >
                  <Icon name="trash-outline" size={14} color={Colors.error} />
                  <Text style={[styles.commentMenuText, { color: Colors.error }]}>Delete</Text>
                </TouchableOpacity>
              )}
              {!isOwner && (
                <TouchableOpacity
                  style={styles.commentMenuItem}
                  onPress={() => {
                    setOpenMenuCommentId(null);
                    handleReportComment(item);
                  }}
                >
                  <Icon name="flag-outline" size={14} color={Colors.error} />
                  <Text style={[styles.commentMenuText, { color: Colors.error }]}>Report</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {item.replyToAuthor && (
            <View style={styles.replyIndicator}>
              <Icon name="return-down-forward-outline" size={12} color={Colors.textLight} />
              <Text style={styles.replyIndicatorText}>@{item.replyToAuthor.displayName}</Text>
            </View>
          )}

          <Text style={styles.commentContent}>{item.content}</Text>

          {/* Compact comment actions: Like · Reply · reaction summary */}
          <View style={styles.commentActions}>
            <TouchableOpacity
              onPress={() => {
                const hasReacted = item.userReactions.length > 0;
                handleToggleCommentReaction(item.id, hasReacted ? item.userReactions[0] : '👍');
              }}
              activeOpacity={0.6}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={[
                styles.commentActionLink,
                item.userReactions.length > 0 && styles.commentActionLinkActive,
              ]}>
                {item.userReactions.length > 0 ? 'Liked' : 'Like'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.commentActionDot}>·</Text>
            <TouchableOpacity
              onPress={() => {
                setReplyingTo({ id: item.id, displayName: item.author.displayName });
                setEditingComment(null);
                setCommentText('');
                inputRef.current?.focus();
              }}
              activeOpacity={0.6}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={styles.commentActionLink}>Reply</Text>
            </TouchableOpacity>
            {(() => {
              const totalReactions = (['👍', '🙏', '❤️'] as const).reduce(
                (sum, e) => sum + (item.reactions[e] ?? 0), 0
              );
              const usedEmojis = (['👍', '🙏', '❤️'] as const).filter(
                (e) => (item.reactions[e] ?? 0) > 0
              );
              if (totalReactions === 0) return null;
              return (
                <View style={styles.commentReactionSummary}>
                  {usedEmojis.map((emoji) => (
                    <Text key={emoji} style={styles.commentReactionEmoji}>{emoji}</Text>
                  ))}
                  <Text style={styles.commentReactionCount}>{totalReactions}</Text>
                </View>
              );
            })()}
          </View>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {post && (
        <ParishPostCard
          post={post}
          currentUserId={currentUserId}
          isParishAdmin={isParishAdmin}
          isMenuOpen={openMenuPostId === post.id}
          onMenuOpen={() => setOpenMenuPostId(post.id)}
          onMenuClose={() => setOpenMenuPostId(null)}
          onEdit={() => {}}
          onDelete={() => navigation.goBack()}
          onReport={() => {}}
          onToggleReaction={handleTogglePostReaction}
          onAuthorPress={(userId) => navigation.navigate('UserProfile', { id: userId })}
        />
      )}
      <View style={styles.commentsDivider}>
        <Text style={styles.commentsTitle}>
          {totalCount} {totalCount === 1 ? 'Comment' : 'Comments'}
        </Text>
      </View>
      {loadingComments && (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing[4] }} />
      )}
    </View>
  );

  const ListFooter = () => loadingMore ? (
    <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing[4] }} />
  ) : null;

  const ListEmpty = () => !loadingComments ? (
    <View style={styles.emptyComments}>
      <Text style={styles.emptyCommentsText}>No comments yet. Be the first to respond!</Text>
    </View>
  ) : null;

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
          <Icon name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Comments list */}
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onRefresh={handleRefresh}
        refreshing={false}
        onScrollBeginDrag={() => { setOpenMenuPostId(null); setOpenMenuCommentId(null); }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Compose bar */}
      <View style={[styles.composeBar, { paddingBottom: Math.max(insets.bottom, Spacing[2]) }]}>
        {(replyingTo || editingComment) && (
          <View style={styles.composeContext}>
            <Text style={styles.composeContextText}>
              {editingComment ? 'Editing comment' : `Replying to @${replyingTo!.displayName}`}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setReplyingTo(null);
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
          <Avatar name={user?.displayName ?? ''} uri={user?.avatarUrl} size={32} />
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingBottom: Spacing[2],
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  listContent: { paddingBottom: Spacing[2] },

  // Comments divider
  commentsDivider: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },
  commentsTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty state
  emptyComments: {
    alignItems: 'center',
    paddingVertical: Spacing[8],
    paddingHorizontal: Spacing[6],
  },
  emptyCommentsText: {
    fontSize: Typography.sm,
    color: Colors.textLight,
    textAlign: 'center',
  },

  // Comment card
  commentCard: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  commentBody: { flex: 1 },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  commentTime: {
    fontSize: Typography.xs,
    color: Colors.textLight,
  },
  commentEdited: {
    fontSize: Typography.xs,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  commentContent: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    lineHeight: Typography.sm * 1.5,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginTop: Spacing[2],
  },
  commentActionLink: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  commentActionLinkActive: {
    color: Colors.primary,
  },
  commentActionDot: {
    fontSize: Typography.xs,
    color: Colors.textLight,
    marginHorizontal: Spacing[2],
  },
  commentReactionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 1,
  },
  commentReactionEmoji: {
    fontSize: 12,
  },
  commentReactionCount: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginLeft: 2,
  },

  // Reply indicator
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  replyIndicatorText: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: Typography.medium,
  },

  // Comment menu
  commentMenu: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  commentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  commentMenuText: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },

  // Compose bar
  composeBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
  composeInput: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    maxHeight: 100,
    paddingVertical: Spacing[2],
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
