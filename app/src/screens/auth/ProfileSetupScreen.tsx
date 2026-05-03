import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from '../../components/ui/Button';
import { FormCard } from '../../components/ui/FormCard';
import { FormField } from '../../components/ui/FormField';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { Separator } from '../../components/ui/Separator';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Colors, Radius, Spacing, Typography } from '../../theme';

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
        <View style={styles.blockIconContainer}>
          <Icon name="cross-outline" size={28} color={Colors.accent} />
        </View>
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
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing[8], paddingBottom: insets.bottom + Spacing[8] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.crossBadge}>
            <Icon name="cross-outline" size={24} color={Colors.accent} />
          </View>
          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.subtitle}>Tell us a little about yourself</Text>
          <View style={styles.goldDivider} />
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Name ── */}
        <SectionLabel>YOUR NAME</SectionLabel>
        <FormCard>
          <FormField
            label="FULL NAME"
            icon="person-outline"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={50}
            autoCapitalize="words"
            placeholder="Your name"
          />
        </FormCard>

        {/* ── Birthday ── */}
        <SectionLabel>BIRTHDAY</SectionLabel>
        <FormCard>
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>DATE OF BIRTH</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateIcon}>
                <Icon name="calendar-outline" size={13} color={Colors.accent} />
              </View>
              <View style={styles.dateFieldMonth}>
                <TextInput
                  style={styles.dateInput}
                  value={birthMonth}
                  onChangeText={(v) => setBirthMonth(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  placeholder="MM"
                  placeholderTextColor={Colors.textLight}
                  maxLength={2}
                />
              </View>
              <Text style={styles.dateSep}>/</Text>
              <View style={styles.dateFieldDay}>
                <TextInput
                  style={styles.dateInput}
                  value={birthDay}
                  onChangeText={(v) => setBirthDay(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  placeholder="DD"
                  placeholderTextColor={Colors.textLight}
                  maxLength={2}
                />
              </View>
              <Text style={styles.dateSep}>/</Text>
              <View style={styles.dateFieldYear}>
                <TextInput
                  style={styles.dateInput}
                  value={birthYear}
                  onChangeText={(v) => setBirthYear(v.replace(/[^0-9]/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  placeholder="YYYY"
                  placeholderTextColor={Colors.textLight}
                  maxLength={4}
                />
              </View>
            </View>
          </View>
        </FormCard>

        {/* ── Bio ── */}
        <SectionLabel>ABOUT YOU</SectionLabel>
        <FormCard>
          <FormField
            label="BIO"
            icon="document-text-outline"
            value={bio}
            onChangeText={setBio}
            maxLength={200}
            multiline
            placeholder="Share a little about your faith journey"
          />
        </FormCard>

        <View style={styles.footer}>
          <Button
            label="Continue"
            onPress={handleContinue}
            loading={loading}
            fullWidth
            size="lg"
            showArrow
          />
          <Text style={styles.hint}>You can always update this later</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  blockedContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing[8] },
  scroll: { paddingBottom: Spacing[8] },

  // ── Header ──
  header: {
    alignItems: 'center',
    marginBottom: Spacing[4],
    paddingHorizontal: Spacing[6],
  },
  crossBadge: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
  },
  title: {
    fontFamily: 'CormorantGaramond-Regular',
    fontSize: Typography['3xl'],
    color: Colors.textPrimary,
    lineHeight: Typography['3xl'] * 1.15,
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing[4],
  },
  goldDivider: {
    width: 28,
    height: 2.5,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },

  // ── Error ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.error + '14',
    borderRadius: Radius.sm,
    padding: Spacing[3],
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[3],
  },
  errorText: { color: Colors.error, fontSize: Typography.sm, flex: 1 },

  // ── Date fields ──
  dateContainer: {
    paddingVertical: Spacing[1],
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 0,
    marginLeft: 26 + Spacing[3],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  dateFieldMonth: { width: 44 },
  dateFieldDay: { width: 44 },
  dateFieldYear: { width: 60 },
  dateInput: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    paddingVertical: Spacing[2],
    textAlign: 'center',
  },
  dateSep: {
    fontSize: Typography.base,
    color: Colors.textLight,
    marginHorizontal: Spacing[1],
  },

  // ── Footer ──
  footer: {
    marginTop: Spacing[6],
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
  },
  hint: {
    fontSize: Typography.xs,
    color: Colors.textLight,
    textAlign: 'center',
  },

  // ── Blocked state ──
  blockIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
  },
  blockTitle: {
    fontFamily: 'CormorantGaramond-Regular',
    fontSize: Typography['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing[4],
  },
  blockBody: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.base * 1.6,
  },
});
