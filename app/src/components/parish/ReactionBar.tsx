import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Spacing, Typography } from '../../theme';
import type { ParishReactionType } from '../../types';

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
  const heartCount = (reactions['❤️'] ?? 0) + (reactions['👍'] ?? 0);
  const hasReacted = userReactions.length > 0;

  const handleHeartPress = () => {
    if (hasReacted) {
      onToggleReaction(itemId, userReactions[0]);
    } else {
      onToggleReaction(itemId, '❤️');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.heartContainer}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleHeartPress}
          activeOpacity={0.6}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Icon
            name={hasReacted ? 'heart' : 'heart-outline'}
            size={16}
            color={hasReacted ? '#dc2626' : Colors.textSecondary}
          />
          {heartCount > 0 && (
            <Text style={[styles.countText, hasReacted && styles.countTextActive]}>{heartCount}</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={onCommentPress}
        activeOpacity={0.6}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Icon name="chatbubble-outline" size={15} color={Colors.textSecondary} />
        {(commentCount ?? 0) > 0 && (
          <Text style={styles.countText}>{commentCount}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[3],
  },
  heartContainer: {
    width: 42,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  countText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  countTextActive: {
    color: '#dc2626',
  },
});
