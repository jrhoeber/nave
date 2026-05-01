import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Avatar } from '../ui/Avatar';
import { ReactionBar } from './ReactionBar';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { ParishPost, ParishReactionType } from '../../types';

interface ParishPostCardProps {
  post: ParishPost;
  currentUserId?: string;
  isParishAdmin: boolean;
  isMenuOpen: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onEdit: (post: ParishPost) => void;
  onDelete: (post: ParishPost) => void;
  onReport: (post: ParishPost) => void;
  onToggleReaction: (postId: string, reaction: ParishReactionType) => void;
  onPress?: () => void;
  onAuthorPress?: (userId: string) => void;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ParishPostCard({
  post, currentUserId, isParishAdmin, isMenuOpen,
  onMenuOpen, onMenuClose, onEdit, onDelete, onReport, onToggleReaction, onPress, onAuthorPress,
}: ParishPostCardProps) {
  const isOwner = currentUserId === post.author.id;
  const canManage = isOwner || isParishAdmin;
  const kebabRef = useRef<View>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleMenuOpen = () => {
    kebabRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPos({ x: x + width - 130, y: y + height + 4 });
      onMenuOpen();
    });
  };

  return (
    <View style={styles.postCard}>
      {post.isAnnouncement && (
        <View style={styles.announcementBadge}>
          <MCIcon name="church" size={11} color={Colors.accent} />
          <Text style={styles.announcementBadgeText}>PARISH ANNOUNCEMENT</Text>
        </View>
      )}
      <View style={styles.postHeader}>
        <TouchableOpacity
          onPress={() => onAuthorPress?.(post.author.id)}
          disabled={!onAuthorPress}
          activeOpacity={0.7}
          style={styles.authorTouchable}
        >
          <Avatar name={post.author.displayName} size={36} uri={post.author.avatarUrl} />
          <View style={styles.postMeta}>
            <Text style={styles.postAuthor}>{post.author.displayName}</Text>
            <Text style={styles.postTime}>{relativeTime(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        {!isOwner || canManage ? (
          <View ref={kebabRef} collapsable={false} style={{ alignSelf: 'flex-start' }}>
            <TouchableOpacity
              onPress={isMenuOpen ? onMenuClose : handleMenuOpen}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="ellipsis-horizontal" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <Modal visible={isMenuOpen} transparent animationType="fade" onRequestClose={onMenuClose}>
              <Pressable style={styles.menuOverlay} onPress={onMenuClose}>
                <View style={[styles.kebabMenu, { left: menuPos.x, top: menuPos.y }]}>
                  {isOwner && (
                    <>
                      <TouchableOpacity
                        style={styles.kebabItem}
                        onPress={() => { onMenuClose(); onEdit(post); }}
                      >
                        <Icon name="pencil-outline" size={15} color={Colors.textPrimary} />
                        <Text style={styles.kebabItemText}>Edit</Text>
                      </TouchableOpacity>
                      <View style={styles.kebabDivider} />
                    </>
                  )}
                  {canManage && (
                    <>
                      <TouchableOpacity
                        style={styles.kebabItem}
                        onPress={() => { onMenuClose(); onDelete(post); }}
                      >
                        <Icon name="trash-outline" size={15} color={Colors.error} />
                        <Text style={[styles.kebabItemText, styles.kebabItemDelete]}>Delete</Text>
                      </TouchableOpacity>
                      {!isOwner && <View style={styles.kebabDivider} />}
                    </>
                  )}
                  {!isOwner && (
                    <TouchableOpacity
                      style={styles.kebabItem}
                      onPress={() => { onMenuClose(); onReport(post); }}
                    >
                      <Icon name="flag-outline" size={15} color={Colors.error} />
                      <Text style={[styles.kebabItemText, styles.kebabItemDelete]}>Report</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Pressable>
            </Modal>
          </View>
        ) : null}
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
  );
}

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    ...Shadows.sm,
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
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[3], gap: Spacing[3] },
  authorTouchable: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing[3] },
  postMeta: { flex: 1 },
  postAuthor: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  postTime: { fontSize: Typography.xs, color: Colors.textLight, marginTop: 1 },
  postContent: { fontSize: Typography.base, color: Colors.textPrimary, lineHeight: Typography.base * 1.5 },
  menuOverlay: {
    flex: 1,
  },
  kebabMenu: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 130,
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
});
