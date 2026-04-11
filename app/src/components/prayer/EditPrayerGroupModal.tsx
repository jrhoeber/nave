import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import type { PrayerGroup, PrayerGroupCategory } from '../../types';
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

interface EditPrayerGroupModalProps {
  group: PrayerGroup;
  visible: boolean;
  onClose: () => void;
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
      <View style={[styles.visibilityIconWrap, selected && styles.visibilityIconWrapSelected]}>
        <Icon name={icon} size={18} color={selected ? Colors.primary : disabled ? Colors.textLight : Colors.textSecondary} />
      </View>
      <Text style={[styles.visibilityLabel, selected && styles.visibilityLabelSelected, disabled && styles.visibilityLabelDisabled]}>{label}</Text>
      <Text style={[styles.visibilitySub, disabled && styles.visibilitySubDisabled]} numberOfLines={2}>{sub}</Text>
      {selected && <View style={styles.visibilityCheck}><Icon name="checkmark-circle" size={16} color={Colors.primary} /></View>}
    </TouchableOpacity>
  );
}

export function EditPrayerGroupModal({ group, visible, onClose }: EditPrayerGroupModalProps) {
  const insets = useSafeAreaInsets();
  const updateGroup = usePrayerStore((s) => s.updateGroup);
  const user = useAuthStore((s) => s.user);
  const parishName = user?.parish ?? null;

  const initialVisibility: Visibility = group.parish ? 'parish' : 'private';

  const [form, setForm] = useState({
    name: group.name,
    description: group.description,
    category: group.category,
    meetingSchedule: group.meetingSchedule ?? '',
    visibility: initialVisibility,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync form if the group prop changes (e.g. after a successful save)
  useEffect(() => {
    if (visible) {
      setForm({
        name: group.name,
        description: group.description,
        category: group.category,
        meetingSchedule: group.meetingSchedule ?? '',
        visibility: group.parish ? 'parish' : 'private',
      });
      setError(null);
    }
  }, [visible]);

  const set = (key: keyof typeof form) => (value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSave = form.name.trim().length > 0 && form.description.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    setError(null);
    try {
      await updateGroup(group.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        is_private: form.visibility === 'private',
        meeting_schedule: form.meetingSchedule.trim() || undefined,
        parish: form.visibility === 'parish' ? (parishName ?? undefined) : undefined,
      });
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Edit Group</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Group Details</Text>
          <Input
            label="Group Name *"
            value={form.name}
            onChangeText={set('name')}
            leftIcon="people-outline"
            placeholder="e.g., Daily Rosary Circle"
            autoCapitalize="words"
          />
          <Input
            label="Description *"
            value={form.description}
            onChangeText={set('description')}
            placeholder="Describe your prayer group's purpose..."
            multiline
            style={styles.textArea}
          />
          <Input
            label="Meeting Schedule (optional)"
            value={form.meetingSchedule}
            onChangeText={set('meetingSchedule')}
            leftIcon="time-outline"
            placeholder="e.g., Sundays at 8 PM via video"
          />

          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(({ value, label, icon }) => (
              <TouchableOpacity
                key={value}
                style={[styles.categoryChip, form.category === value && styles.categoryChipActive]}
                onPress={() => set('category')(value)}
              >
                <Text style={styles.categoryIcon}>{icon}</Text>
                <Text style={[styles.categoryLabel, form.category === value && styles.categoryLabelActive]}>
                  {label}
                </Text>
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
          <Button
            label="Save Changes"
            onPress={handleSave}
            loading={loading}
            disabled={!canSave}
            fullWidth
            size="lg"
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
  visibilityLabel: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  visibilityLabelSelected: { color: Colors.primary },
  visibilityLabelDisabled: { color: Colors.textSecondary },
  visibilitySub: { fontSize: Typography.xs, color: Colors.textSecondary, lineHeight: 16 },
  visibilitySubDisabled: { color: Colors.textLight },
  visibilityCheck: { position: 'absolute', top: Spacing[2], right: Spacing[2] },
  saveBtn: { marginTop: Spacing[2] },
  errorText: { fontSize: Typography.sm, color: Colors.error, textAlign: 'center', marginBottom: Spacing[2] },
});
