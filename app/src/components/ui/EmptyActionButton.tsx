import React from 'react';
import { StyleSheet, Text, TouchableOpacity, type ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../theme';

interface EmptyActionButtonProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function EmptyActionButton({ label, onPress, style }: EmptyActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>{label}</Text>
      <Text style={styles.arrow}>{'\u2192'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing[2],
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  text: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: '#ffffff',
  },
  arrow: {
    fontSize: Typography.base,
    color: '#ffffff',
  },
});
