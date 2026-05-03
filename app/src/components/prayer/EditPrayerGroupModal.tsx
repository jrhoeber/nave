import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormHeader } from '../ui/FormHeader';
import { GroupFormFields } from '../group/GroupFormFields';
import { CategoryPicker } from '../group/CategoryPicker';
import { VisibilityPicker } from '../group/VisibilityPicker';
import { Colors, Spacing, Typography } from '../../theme';
import type { PrayerGroup } from '../../types';
import { usePrayerStore } from '../../store/prayerStore';
import { useAuthStore } from '../../store/authStore';

type Visibility = 'private' | 'parish';

interface EditPrayerGroupModalProps {
  group: PrayerGroup;
  visible: boolean;
  onClose: () => void;
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

  const hasChanges =
    form.name.trim() !== group.name ||
    form.description.trim() !== group.description ||
    form.category !== group.category ||
    form.meetingSchedule.trim() !== (group.meetingSchedule ?? '') ||
    form.visibility !== initialVisibility;

  const canSave = form.name.trim().length > 0 && form.description.trim().length > 0 && hasChanges;

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
        <FormHeader
          title="Edit Group"
          onBack={onClose}
          actionLabel="Save"
          onAction={handleSave}
          actionDisabled={!canSave}
          loading={loading}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GroupFormFields
            name={form.name}
            description={form.description}
            meetingSchedule={form.meetingSchedule}
            onChangeName={set('name')}
            onChangeDescription={set('description')}
            onChangeMeetingSchedule={set('meetingSchedule')}
          />
          <CategoryPicker value={form.category} onChange={set('category')} />
          <VisibilityPicker value={form.visibility} onChange={set('visibility')} parishName={parishName} />

          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: Spacing[12],
  },
  errorText: {
    fontSize: Typography.sm,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing[4],
    marginHorizontal: Spacing[5],
  },
});
