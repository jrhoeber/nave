import React from 'react';
import { ActionSheetIOS, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Avatar } from '../ui/Avatar';
import { ReactionBar } from './ReactionBar';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import type { ParishPost, ParishReactionType } from '../../types';

interface ParishPostCardProps {
  post: ParishPost;
  currentUserId?: string;
  isParishAdmin: boolean;
  onEdit: (post: ParishPost) => void;
  onDelete: (post: ParishPost) => void;
  onReport: (post: ParishPost) => void;
  onToggleReaction: (postId: string, reaction: ParishReactionType) => void;
  onPress?: () => void;
  onAuthorPress?: (userId: string) => void;
  isLast?: boolean;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function ParishPostCardImpl({
  post, currentUserId, isParishAdmin,
  onEdit, onDelete, onReport, onToggleReaction, onPress, onAuthorPress,
  isLast,
}: ParishPostCardProps) {
  const isOwner = currentUserId === post.author.id;
  const canManage = isOwner || isParishAdmin;

  const handleLongPress = () => {
    const options: string[] = [];
    const actions: (() => void)[] = [];

    if (isOwner) {
      options.push('Edit');
      actions.push(() => onEdit(post));
    }
    if (canManage) {
      options.push('Delete');
      actions.push(() => onDelete(post));
    }
    if (!isOwner) {
      options.push('Report');
      actions.push(() => onReport(post));
    }

    if (options.length === 0) return;

    options.push('Cancel');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: options.indexOf('Delete') !== -1 ? options.indexOf('Delete') : undefined,
        },
        (index) => {
          if (index < actions.length) actions[index]();
        },
      );
    } else {
      Alert.alert(
        'Post Options',
        undefined,
        [
          ...actions.map((action, i) => ({
            text: options[i],
            onPress: action,
            style: options[i] === 'Delete' ? ('destructive' as const) : ('default' as const),
          })),
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  };

  return (
    <TouchableOpacity
      style={[styles.postCard, isLast && styles.postCardLast]}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      delayLongPress={400}
    >
      {post.isAnnouncement && (
        <View style={styles.announcementBadge}>
          <MCIcon name="church" size={11} color={Colors.accent} />
          <Text style={styles.announcementBadgeText}>PARISH ANNOUNCEMENT</Text>
        </View>
      )}
      <View style={styles.postRow}>
        <TouchableOpacity
          onPress={() => onAuthorPress?.(post.author.id)}
          disabled={!onAuthorPress}
          activeOpacity={0.7}
        >
          <Avatar name={post.author.displayName} size={44} uri={post.author.avatarUrl} />
        </TouchableOpacity>
        <View style={styles.postRight}>
          <View style={styles.nameRow}>
            <Text style={styles.postAuthor}>{post.author.displayName}</Text>
            <Text style={styles.postTime}> · {relativeTime(post.createdAt)}</Text>
          </View>
          <Text style={styles.postContent}>{post.content}</Text>
          <ReactionBar
            reactions={post.reactions}
            userReactions={post.userReactions}
            itemId={post.id}
            commentCount={post.commentCount}
            onToggleReaction={onToggleReaction}
            onCommentPress={onPress}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ParishPostCard = React.memo(ParishPostCardImpl, (prev, next) => {
  const a = prev.post;
  const b = next.post;
  return (
    a.id === b.id &&
    a.content === b.content &&
    a.commentCount === b.commentCount &&
    a.isAnnouncement === b.isAnnouncement &&
    a.reactions === b.reactions &&
    a.userReactions === b.userReactions &&
    prev.currentUserId === next.currentUserId &&
    prev.isParishAdmin === next.isParishAdmin &&
    prev.isLast === next.isLast &&
    prev.onEdit === next.onEdit &&
    prev.onDelete === next.onDelete &&
    prev.onReport === next.onReport &&
    prev.onToggleReaction === next.onToggleReaction &&
    prev.onPress === next.onPress &&
    prev.onAuthorPress === next.onAuthorPress
  );
});

const styles = StyleSheet.create({
  postCard: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardBorder,
  },
  postCardLast: {
    borderBottomWidth: 0,
  },
  announcementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing[3],
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent + '20',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: 3,
  },
  announcementBadgeText: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.accent,
    letterSpacing: 0.8,
  },
  postRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  postRight: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  postAuthor: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  postTime: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  postContent: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    lineHeight: Typography.base * 1.55,
  },
});
