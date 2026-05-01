import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { ParishReactionType } from '../../types';

const REACTION_EMOJIS: ParishReactionType[] = ['👍', '🙏', '❤️'];

interface ReactionBarProps {
  reactions: Record<ParishReactionType, number>;
  userReactions: ParishReactionType[];
  itemId: string;
  commentCount?: number;
  onToggleReaction: (itemId: string, reaction: ParishReactionType) => void;
  onCommentPress?: () => void;
}

export function ReactionBar({
  reactions, userReactions, itemId, commentCount,
  onToggleReaction, onCommentPress,
}: ReactionBarProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });
  const reactBtnRef = useRef<View>(null);

  const totalReactions = REACTION_EMOJIS.reduce((sum, e) => sum + (reactions[e] ?? 0), 0);
  const usedEmojis = REACTION_EMOJIS.filter((e) => (reactions[e] ?? 0) > 0);
  const hasReacted = userReactions.length > 0;

  const handleReactPress = () => {
    if (hasReacted) {
      onToggleReaction(itemId, userReactions[0]);
    } else {
      onToggleReaction(itemId, '👍');
    }
    setPickerVisible(false);
  };

  const handleReactLongPress = () => {
    reactBtnRef.current?.measureInWindow((x, y) => {
      setPickerPos({ x, y: y - 52 });
      setPickerVisible(true);
    });
  };

  return (
    <View>
      {/* Reaction summary + comment count row */}
      {(totalReactions > 0 || (commentCount ?? 0) > 0) && (
        <View style={styles.summaryRow}>
          {totalReactions > 0 && (
            <View style={styles.reactionSummary}>
              <View style={styles.emojiStack}>
                {usedEmojis.map((emoji, i) => (
                  <View key={emoji} style={[styles.emojiCircle, i > 0 && { marginLeft: -4 }]}>
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.summaryCount}>{totalReactions}</Text>
            </View>
          )}
          {(commentCount ?? 0) > 0 && (
            <TouchableOpacity onPress={onCommentPress} activeOpacity={0.6} style={styles.commentSummary}>
              <Text style={styles.commentSummaryText}>
                {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Emoji picker modal — transparent overlay, dismisses on tap outside */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setPickerVisible(false)}>
          <View style={[styles.pickerFloating, { left: pickerPos.x, top: pickerPos.y }]}>
            {REACTION_EMOJIS.map((emoji) => {
              const active = userReactions.includes(emoji);
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.pickerEmoji, active && styles.pickerEmojiActive]}
                  onPress={() => {
                    onToggleReaction(itemId, emoji);
                    setPickerVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <View ref={reactBtnRef} collapsable={false} style={{ flex: 1 }}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleReactPress}
            onLongPress={handleReactLongPress}
            activeOpacity={0.6}
          >
            <Icon
              name={hasReacted ? 'happy' : 'happy-outline'}
              size={18}
              color={hasReacted ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.actionText, hasReacted && styles.actionTextActive]}>React</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onCommentPress}
          activeOpacity={0.6}
        >
          <Icon name="chatbubble-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Summary row
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
  },
  reactionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  emojiStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 11,
  },
  summaryCount: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  commentSummary: {
    marginLeft: 'auto',
  },
  commentSummaryText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing[1],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[1],
    paddingVertical: Spacing[2],
  },
  actionText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  actionTextActive: {
    color: Colors.primary,
  },

  // Emoji picker modal
  pickerOverlay: {
    flex: 1,
  },
  pickerFloating: {
    position: 'absolute',
    flexDirection: 'row',
    gap: Spacing[1],
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[2],
    ...Shadows.md,
  },
  pickerEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmojiActive: {
    backgroundColor: Colors.primary + '15',
  },
  pickerEmojiText: {
    fontSize: 24,
  },
});
