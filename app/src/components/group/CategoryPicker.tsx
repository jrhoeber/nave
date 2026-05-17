import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import { SectionLabel } from '../ui/SectionLabel';
import type { PrayerGroupCategory } from '../../types';
import { CATEGORIES } from './constants';
import { Text } from '../ui/Text';

interface CategoryPickerProps {
  value: PrayerGroupCategory;
  onChange: (category: PrayerGroupCategory) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <>
      <SectionLabel>CATEGORY</SectionLabel>
      <View style={styles.grid}>
        {CATEGORIES.map(({ value: cat, label }) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, value === cat && styles.chipActive]}
            onPress={() => onChange(cat)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, value === cat && styles.labelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[2],
  },
  chip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  label: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  labelActive: {
    color: Colors.primary,
  },
});
