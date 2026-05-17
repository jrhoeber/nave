import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors, Spacing, Typography } from '../../theme';
import { EmptyActionButton } from './EmptyActionButton';
import { Text } from './Text';

interface EmptyStateBoxProps {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  style?: ViewStyle;
}

export function EmptyStateBox({ title, body, actionLabel, onAction, style }: EmptyStateBoxProps) {
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <EmptyActionButton label={actionLabel} onPress={onAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#ffffff',
    marginHorizontal: Spacing[3],
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.cardBorder,
    padding: Spacing[5],
  },
  title: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 24,
    color: Colors.textPrimary,
    marginBottom: Spacing[2],
  },
  body: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing[4],
  },
});
