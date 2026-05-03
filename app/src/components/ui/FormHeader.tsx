import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Spacing, Typography } from '../../theme';

interface FormHeaderProps {
  title: string;
  onBack: () => void;
  /** Label for the action button (e.g., "Save", "Create") */
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
  loading?: boolean;
  /** Icon name for the back button. Defaults to "chevron-back". */
  backIcon?: string;
}

export function FormHeader({
  title,
  onBack,
  actionLabel,
  onAction,
  actionDisabled = false,
  loading = false,
  backIcon = 'chevron-back',
}: FormHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name={backIcon} size={24} color={Colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity
        onPress={onAction}
        disabled={loading || actionDisabled}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Colors.accent} />
        ) : (
          <Text style={[styles.actionText, actionDisabled && styles.actionTextDisabled]}>
            {actionLabel}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  actionText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.primaryDark,
  },
  actionTextDisabled: {
    opacity: 0.4,
  },
});
