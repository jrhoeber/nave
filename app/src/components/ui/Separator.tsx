import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors, Spacing } from '../../theme';

interface SeparatorProps {
  style?: ViewStyle;
}

export function Separator({ style }: SeparatorProps) {
  return <View style={[styles.sep, style]} />;
}

const styles = StyleSheet.create({
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing[2],
  },
});
