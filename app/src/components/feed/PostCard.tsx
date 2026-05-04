import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '../../components/ui/Avatar';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { Post, PostType } from '../../types';

interface PostCardProps {
  post: Post;
  onLike: (id: string) => void;
  onPray: (id: string) => void;
  onComment: (id: string) => void;
  onPress: (id: string) => void;
  onAuthorPress: (userId: string) => void;
}

const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; icon: string }> = {
  prayer_request: { label: 'Prayer Request', color: '#7c3aed', icon: 'hand-right-outline' },
  testimony:      { label: 'Testimony',      color: Colors.accentDark, icon: 'star-outline' },
  event:          { label: 'Event',           color: Colors.info, icon: 'calendar-outline' },
  scripture:      { label: 'Scripture',       color: Colors.success, icon: 'book-outline' },
  general:        { label: '',                color: Colors.textSecondary, icon: 'chatbubble-outline' },
};

function PostCardImpl({ post, onLike, onPray, onComment, onPress, onAuthorPress }: PostCardProps) {
  const typeConfig = POST_TYPE_CONFIG[post.type];
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  return (
    <TouchableOpacity onPress={() => onPress(post.id)} activeOpacity={0.97} style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onAuthorPress(post.author.id)} style={styles.authorRow}>
          <Avatar uri={post.author.avatarUrl} name={post.author.displayName} size={42} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.author.displayName}</Text>
            <Text style={styles.authorMeta}>
              {post.author.parish ? `${post.author.parish} · ` : ''}{timeAgo}
            </Text>
          </View>
        </TouchableOpacity>
        {post.type !== 'general' && (
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '18' }]}>
            <Icon name={typeConfig.icon} size={11} color={typeConfig.color} />
            <Text style={[styles.typeLabel, { color: typeConfig.color }]}>{typeConfig.label}</Text>
          </View>
        )}
      </View>

      <Text style={styles.content}>{post.content}</Text>

      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.image} resizeMode="cover" />
      )}

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onPray(post.id)} style={styles.actionBtn}>
          <Icon name={post.isPraying ? 'hand-right' : 'hand-right-outline'} size={20}
            color={post.isPraying ? '#7c3aed' : Colors.textSecondary} />
          {post.prayerCount > 0 && (
            <Text style={[styles.actionCount, post.isPraying && styles.prayingCount]}>
              {post.prayerCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onLike(post.id)} style={styles.actionBtn}>
          <Icon name={post.isLiked ? 'heart' : 'heart-outline'} size={20}
            color={post.isLiked ? Colors.error : Colors.textSecondary} />
          {post.likeCount > 0 && (
            <Text style={[styles.actionCount, post.isLiked && { color: Colors.error }]}>
              {post.likeCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onComment(post.id)} style={styles.actionBtn}>
          <Icon name="chatbubble-outline" size={19} color={Colors.textSecondary} />
          {post.commentCount > 0 && <Text style={styles.actionCount}>{post.commentCount}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]}>
          <Icon name="arrow-redo-outline" size={19} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export const PostCard = React.memo(PostCardImpl, (prev, next) => {
  const a = prev.post;
  const b = next.post;
  return (
    a.id === b.id &&
    a.likeCount === b.likeCount &&
    a.prayerCount === b.prayerCount &&
    a.commentCount === b.commentCount &&
    a.isLiked === b.isLiked &&
    a.isPraying === b.isPraying &&
    a.content === b.content &&
    a.imageUrl === b.imageUrl &&
    a.type === b.type &&
    prev.onLike === next.onLike &&
    prev.onPray === next.onPray &&
    prev.onComment === next.onComment &&
    prev.onPress === next.onPress &&
    prev.onAuthorPress === next.onAuthorPress
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    ...Shadows.sm,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing[3] },
  authorRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  authorInfo: { marginLeft: Spacing[3], flex: 1 },
  authorName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  authorMeta: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing[2], paddingVertical: 4,
    borderRadius: Radius.full, gap: 3, marginLeft: Spacing[2],
  },
  typeLabel: { fontSize: Typography.xs, fontWeight: Typography.medium },
  content: {
    fontSize: Typography.base, color: Colors.textPrimary,
    lineHeight: Typography.base * Typography.relaxed, marginBottom: Spacing[3],
  },
  image: { width: '100%', height: 220, borderRadius: Radius.md, marginBottom: Spacing[3], backgroundColor: Colors.surfaceAlt },
  actions: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
    paddingTop: Spacing[3], gap: Spacing[4],
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1] },
  shareBtn: { marginLeft: 'auto' },
  actionCount: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  prayingCount: { color: '#7c3aed' },
});
