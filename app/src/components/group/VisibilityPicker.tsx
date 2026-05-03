import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import { SectionLabel } from '../ui/SectionLabel';
import { FormCard } from '../ui/FormCard';
import { Separator } from '../ui/Separator';

type Visibility = 'private' | 'parish';

interface VisibilityPickerProps {
  value: Visibility;
  onChange: (visibility: Visibility) => void;
  parishName: string | null;
}

export function VisibilityPicker({ value, onChange, parishName }: VisibilityPickerProps) {
  return (
    <>
      <SectionLabel>VISIBILITY</SectionLabel>
      <FormCard>
        <TouchableOpacity
          style={styles.row}
          onPress={() => onChange('private')}
          activeOpacity={0.7}
        >
          <View style={styles.icon}>
            <Icon name="lock-closed-outline" size={13} color={Colors.accent} />
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>Private</Text>
            <Text style={styles.sub}>Members must be approved to join</Text>
          </View>
          {value === 'private' && (
            <Icon name="checkmark-circle" size={20} color={Colors.primary} />
          )}
        </TouchableOpacity>

        <Separator />

        <TouchableOpacity
          style={[styles.row, !parishName && { opacity: 0.5 }]}
          onPress={() => parishName && onChange('parish')}
          activeOpacity={parishName ? 0.7 : 1}
        >
          <View style={styles.icon}>
            <Icon name="business-outline" size={13} color={Colors.accent} />
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>Parish</Text>
            <Text style={styles.sub}>
              {parishName ? parishName : 'Join a parish to enable'}
            </Text>
          </View>
          {value === 'parish' && (
            <Icon name="checkmark-circle" size={20} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </FormCard>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  icon: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
