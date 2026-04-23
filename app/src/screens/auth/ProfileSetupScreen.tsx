import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Colors, Spacing, Typography } from '../../theme';

function isValidDate(month: string, day: string, year: string): boolean {
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  if (isNaN(m) || isNaN(d) || isNaN(y)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function calculateAge(month: string, day: string, year: string): number {
  const birthDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuthStore((s) => ({ user: s.user, updateUser: s.updateUser }));

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [ageBlocked, setAgeBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setError('');
    setAgeBlocked(false);

    if (!displayName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!birthMonth || !birthDay || !birthYear) {
      setError('Please enter your birthday.');
      return;
    }
    if (!isValidDate(birthMonth, birthDay, birthYear)) {
      setError('Please enter a valid date.');
      return;
    }

    const age = calculateAge(birthMonth, birthDay, birthYear);
    if (age < 13) {
      setAgeBlocked(true);
      return;
    }

    const m = birthMonth.padStart(2, '0');
    const d = birthDay.padStart(2, '0');
    const y = birthYear;
    const birthday = `${y}-${m}-${d}`;

    setLoading(true);
    try {
      await api.updateProfile({
        display_name: displayName.trim(),
        birthday,
        bio: bio.trim() || undefined,
      });
      await updateUser({
        displayName: displayName.trim(),
        birthday,
        bio: bio.trim() || undefined,
      });
      // RootNavigator will automatically route to ParishSetup once birthday is set
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (ageBlocked) {
    return (
      <View style={[styles.container, styles.blockedContainer, { paddingTop: insets.top + Spacing[6], paddingBottom: insets.bottom + Spacing[6] }]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.blockIcon}>✝</Text>
        <Text style={styles.blockTitle}>Nave is for ages 13+</Text>
        <Text style={styles.blockBody}>
          We're sorry — Nave is designed for users who are 13 years old and older. We hope to
          see you when you're ready.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing[6], paddingBottom: insets.bottom + Spacing[8] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.cross}>✝</Text>
          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.subtitle}>Tell us a little about yourself</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Input
          label="Full Name *"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          leftIcon="person-outline"
          placeholder="Your name"
        />

        <Text style={styles.fieldLabel}>Birthday *</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateFieldMonth}>
            <Input
              label=""
              value={birthMonth}
              onChangeText={(v) => setBirthMonth(v.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              placeholder="MM"
              maxLength={2}
            />
          </View>
          <View style={styles.dateFieldDay}>
            <Input
              label=""
              value={birthDay}
              onChangeText={(v) => setBirthDay(v.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              placeholder="DD"
              maxLength={2}
            />
          </View>
          <View style={styles.dateFieldYear}>
            <Input
              label=""
              value={birthYear}
              onChangeText={(v) => setBirthYear(v.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              placeholder="YYYY"
              maxLength={4}
            />
          </View>
        </View>

        <Input
          label="Bio (optional)"
          value={bio}
          onChangeText={setBio}
          placeholder="Share a little about your faith journey"
          leftIcon="document-text-outline"
          multiline
        />

        <Button
          label="Continue"
          onPress={handleContinue}
          loading={loading}
          fullWidth
          size="lg"
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  blockedContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing[8] },
  scroll: { paddingHorizontal: Spacing[6] },
  header: { marginBottom: Spacing[6] },
  cross: { fontSize: 32, color: Colors.accent, marginBottom: Spacing[3] },
  title: { fontSize: Typography['3xl'], fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[1] },
  subtitle: { fontSize: Typography.base, color: Colors.textSecondary },
  errorBanner: { backgroundColor: Colors.error + '14', borderRadius: 8, padding: Spacing[3], marginBottom: Spacing[4] },
  errorText: { color: Colors.error, fontSize: Typography.sm },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary, marginBottom: Spacing[1], marginTop: Spacing[1] },
  dateRow: { flexDirection: 'row', gap: Spacing[3], marginBottom: Spacing[2] },
  dateFieldMonth: { flex: 1 },
  dateFieldDay: { flex: 1 },
  dateFieldYear: { flex: 1.6 },
  submitBtn: { marginTop: Spacing[4] },
  blockIcon: { fontSize: 48, color: Colors.accent, marginBottom: Spacing[5] },
  blockTitle: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing[4] },
  blockBody: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: Typography.base * 1.6 },
});
