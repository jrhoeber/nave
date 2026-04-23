import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Colors, Spacing, Typography, Shadows } from '../../theme';
import type { Parish } from '../../types';

export function ParishSetupScreen() {
  const insets = useSafeAreaInsets();
  const updateUser = useAuthStore((s) => s.updateUser);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Parish[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Parish | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (text: string) => {
    setQuery(text);
    setSelected(null);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await api.searchParishes(text.trim());
      setResults(data.parishes.map((p: any) => ({
        id: p.id,
        name: p.name,
        city: p.city,
        state: p.state,
        diocese: p.diocese,
        memberCount: p.member_count ?? 0,
      })));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (parish: Parish) => {
    setSelected(parish);
    setQuery(parish.name);
    setResults([]);
  };

  const handleContinue = async () => {
    if (!selected) {
      setError('Please search for and select your parish to continue.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await api.updateProfile({ parish_id: selected.id });
      await updateUser({ parishId: selected.id, parish: selected.name });
      // RootNavigator will automatically navigate to App once parishId is set
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.inner, { paddingTop: insets.top + Spacing[6], paddingBottom: insets.bottom + Spacing[6] }]}>
        <View style={styles.header}>
          <Text style={styles.cross}>✝</Text>
          <Text style={styles.title}>Find your parish</Text>
          <Text style={styles.subtitle}>
            Search for your home parish to connect with your local Catholic community.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Input
              label=""
              value={query}
              onChangeText={handleSearch}
              placeholder="Search by parish name or city…"
              leftIcon="search-outline"
              autoCapitalize="words"
              returnKeyType="search"
            />
          </View>
          {searching && <ActivityIndicator size="small" color={Colors.primary} style={styles.spinner} />}
        </View>

        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultRow} onPress={() => handleSelect(item)} activeOpacity={0.7}>
                  <View style={styles.resultIcon}>
                    <Icon name="business-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.resultText}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultSub}>{item.city}, {item.state}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}

        {selected && (
          <View style={styles.selectedCard}>
            <Icon name="checkmark-circle" size={22} color={Colors.success} />
            <View style={styles.selectedText}>
              <Text style={styles.selectedName}>{selected.name}</Text>
              <Text style={styles.selectedSub}>{selected.city}, {selected.state}</Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Button
            label="Join Nave"
            onPress={handleContinue}
            loading={saving}
            fullWidth
            size="lg"
            disabled={!selected}
          />
          <Text style={styles.hint}>
            You must select a parish to complete sign-up.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: Spacing[6] },
  header: { marginBottom: Spacing[6] },
  cross: { fontSize: 32, color: Colors.accent, marginBottom: Spacing[3] },
  title: { fontSize: Typography['3xl'], fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[1] },
  subtitle: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: Typography.base * 1.5 },
  errorBanner: { backgroundColor: Colors.error + '14', borderRadius: 8, padding: Spacing[3], marginBottom: Spacing[3] },
  errorText: { color: Colors.error, fontSize: Typography.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInputWrapper: { flex: 1 },
  spinner: { marginLeft: Spacing[2] },
  resultsContainer: { backgroundColor: Colors.surface, borderRadius: 12, maxHeight: 280, ...Shadows.md, marginBottom: Spacing[3] },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing[4], gap: Spacing[3] },
  resultIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  resultText: { flex: 1 },
  resultName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  resultSub: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.divider, marginLeft: Spacing[4] + 36 + Spacing[3] },
  selectedCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], backgroundColor: Colors.success + '12', borderRadius: 12, padding: Spacing[4], marginBottom: Spacing[4] },
  selectedText: { flex: 1 },
  selectedName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  selectedSub: { fontSize: Typography.sm, color: Colors.textSecondary },
  footer: { marginTop: 'auto', gap: Spacing[3] },
  hint: { fontSize: Typography.xs, color: Colors.textLight, textAlign: 'center' },
});
