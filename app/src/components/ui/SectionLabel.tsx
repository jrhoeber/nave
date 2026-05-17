import React from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import { Colors, Spacing, Typography } from '../../theme';
import { Text } from './Text';

interface SectionLabelProps {
  children: string;
  style?: TextStyle;
}

export function SectionLabel({ children, style }: SectionLabelProps) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.accent,
    letterSpacing: 1.5,
    marginBottom: Spacing[3],
    marginHorizontal: Spacing[5],
    marginTop: Spacing[4],
  },
});
