import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Spacing, Typography } from '../../theme';
import { Text } from '../ui/Text';

interface ReactionBarProps {
  reactionCount: number;
  userReacted: boolean;
  itemId: string;
  commentCount?: number;
  onToggleReaction: (itemId: string) => void;
  onCommentPress?: () => void;
}

export function ReactionBar({
  reactionCount, userReacted, itemId, commentCount,
  onToggleReaction, onCommentPress,
}: ReactionBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.heartContainer}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onToggleReaction(itemId)}
          activeOpacity={0.6}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Icon
            name={userReacted ? 'heart' : 'heart-outline'}
            size={16}
            color={userReacted ? Colors.heart : Colors.textSecondary}
          />
          {reactionCount > 0 && (
            <Text style={[styles.countText, userReacted && styles.countTextActive]}>{reactionCount}</Text>
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
    color: Colors.heart,
  },
});
