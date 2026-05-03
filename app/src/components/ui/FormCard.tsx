import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '../../theme';

interface FormCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function FormCard({ children, style }: FormCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[2],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
  },
});
