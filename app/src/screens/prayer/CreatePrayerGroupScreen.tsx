import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import type { PrayerGroupCategory } from '../../types';
import { api } from '../../lib/apiClient';
import { usePrayerStore } from '../../store/prayerStore';
import { useAuthStore } from '../../store/authStore';

type Visibility = 'private' | 'parish';

const CATEGORIES: { value: PrayerGroupCategory; label: string; icon: string }[] = [
  { value: 'rosary', label: 'Rosary', icon: '📿' },
  { value: 'scripture_study', label: 'Scripture Study', icon: '📖' },
  { value: 'mens_group', label: "Men's Group", icon: '🛡️' },
  { value: 'womens_group', label: "Women's Group", icon: '🌸' },
  { value: 'youth', label: 'Youth', icon: '😊' },
  { value: 'young_adults', label: 'Young Adults', icon: '🙌' },
  { value: 'families', label: 'Families', icon: '🏠' },
  { value: 'devotional', label: 'Devotional', icon: '❤️' },
  { value: 'general', label: 'General', icon: '💬' },
];

export function CreatePrayerGroupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const fetchGroups = usePrayerStore((s) => s.fetchGroups);

  const parishName = user?.parish ?? null;

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'general' as PrayerGroupCategory,
    meetingSchedule: '',
    visibility: 'private' as Visibility,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: any) => setForm((f) => ({ ...f, [key]: value }));
  const canCreate = form.name.trim().length > 0 && form.description.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    setLoading(true);
    setError(null);
    try {
      await api.createGroup({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        is_private: form.visibility === 'private',
        meeting_schedule: form.meetingSchedule.trim() || undefined,
        parish: form.visibility === 'parish' ? (parishName ?? undefined) : undefined,
      });
      await fetchGroups();
      navigation.goBack();
    } catch (e: any) {
      setError(e.message ?? 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>New Prayer Group</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Group Details</Text>
        <Input label="Group Name *" value={form.name} onChangeText={set('name')} leftIcon="people-outline" placeholder="e.g., Daily Rosary Circle" autoCapitalize="words" />
        <Input label="Description *" value={form.description} onChangeText={set('description')} placeholder="Describe your prayer group's purpose..." multiline style={styles.textArea} />
        <Input label="Meeting Schedule (optional)" value={form.meetingSchedule} onChangeText={set('meetingSchedule')} leftIcon="time-outline" placeholder="e.g., Sundays at 8 PM via video" />

        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(({ value, label, icon }) => (
            <TouchableOpacity key={value} style={[styles.categoryChip, form.category === value && styles.categoryChipActive]} onPress={() => set('category')(value)}>
              <Text style={styles.categoryIcon}>{icon}</Text>
              <Text style={[styles.categoryLabel, form.category === value && styles.categoryLabelActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Visibility</Text>
        <View style={styles.visibilityRow}>
          <VisibilityCard
            icon="lock-closed-outline"
            label="Private"
            sub="Members must be approved to join"
            selected={form.visibility === 'private'}
            onPress={() => set('visibility')('private')}
          />
          <VisibilityCard
            icon="business-outline"
            label="Parish"
            sub={parishName ? parishName : 'Join a parish to enable'}
            selected={form.visibility === 'parish'}
            disabled={!parishName}
            onPress={() => parishName && set('visibility')('parish')}
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
        <Button label="Create Prayer Group" onPress={handleCreate} loading={loading} disabled={!canCreate} fullWidth size="lg" style={styles.createBtn} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function VisibilityCard({ icon, label, sub, selected, disabled, onPress }: {
  icon: string;
  label: string;
  sub: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.visibilityCard, selected && styles.visibilityCardSelected, disabled && styles.visibilityCardDisabled]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <View style={[styles.visibilityIconWrap, selected && styles.visibilityIconWrapSelected, disabled && styles.visibilityIconWrapDisabled]}>
        <Icon name={icon} size={18} color={selected ? Colors.primary : disabled ? Colors.textLight : Colors.textSecondary} />
      </View>
      <Text style={[styles.visibilityLabel, selected && styles.visibilityLabelSelected, disabled && styles.visibilityLabelDisabled]}>{label}</Text>
      <Text style={[styles.visibilitySub, disabled && styles.visibilitySubDisabled]} numberOfLines={2}>{sub}</Text>
      {selected && <View style={styles.visibilityCheck}><Icon name="checkmark-circle" size={16} color={Colors.primary} /></View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  cancelText: { fontSize: Typography.base, color: Colors.textSecondary, width: 60 },
  toolbarTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[10] },
  sectionTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing[3], marginTop: Spacing[2] },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[5] },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  categoryChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  categoryIcon: { fontSize: 14 },
  categoryLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  categoryLabelActive: { color: Colors.primary },

  visibilityRow: { flexDirection: 'row', gap: Spacing[3], marginBottom: Spacing[6] },
  visibilityCard: { flex: 1, padding: Spacing[3], borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface, gap: Spacing[1] },
  visibilityCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  visibilityCardDisabled: { opacity: 0.5 },
  visibilityIconWrap: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[1] },
  visibilityIconWrapSelected: { backgroundColor: Colors.primary + '18' },
  visibilityIconWrapDisabled: { backgroundColor: Colors.surfaceAlt },
  visibilityLabel: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  visibilityLabelSelected: { color: Colors.primary },
  visibilityLabelDisabled: { color: Colors.textSecondary },
  visibilitySub: { fontSize: Typography.xs, color: Colors.textSecondary, lineHeight: 16 },
  visibilitySubDisabled: { color: Colors.textLight },
  visibilityCheck: { position: 'absolute', top: Spacing[2], right: Spacing[2] },

  createBtn: { marginTop: Spacing[2] },
  errorText: { fontSize: Typography.sm, color: Colors.error, textAlign: 'center', marginBottom: Spacing[2] },
});
