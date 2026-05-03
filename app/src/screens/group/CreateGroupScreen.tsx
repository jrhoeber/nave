import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormHeader } from '../../components/ui/FormHeader';
import { GroupFormFields } from '../../components/group/GroupFormFields';
import { CategoryPicker } from '../../components/group/CategoryPicker';
import { VisibilityPicker } from '../../components/group/VisibilityPicker';
import { Colors, Spacing, Typography } from '../../theme';
import type { PrayerGroupCategory } from '../../types';
import { api } from '../../lib/apiClient';
import { usePrayerStore } from '../../store/prayerStore';
import { useAuthStore } from '../../store/authStore';

type Visibility = 'private' | 'parish';

export function CreateGroupScreen() {
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

  const set = (key: keyof typeof form) => (value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

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
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" />

      <FormHeader
        title="New Group"
        onBack={() => navigation.goBack()}
        actionLabel="Create"
        onAction={handleCreate}
        actionDisabled={!canCreate}
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
          testIDPrefix="create-group"
        />
        <CategoryPicker value={form.category} onChange={set('category')} />
        <VisibilityPicker value={form.visibility} onChange={set('visibility')} parishName={parishName} />

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
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
