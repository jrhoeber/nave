import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../theme';

interface Props {
  show: boolean;
}

export function TabBadge({ show }: Props) {
  if (!show) return null;
  return <View style={styles.indicator} />;
}

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.accent,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
});
