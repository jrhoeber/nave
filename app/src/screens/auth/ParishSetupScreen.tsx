import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { api, mapUser } from '../../lib/apiClient';
import { CardList, Colors, Radius, Spacing, Typography } from '../../theme';
import type { Parish } from '../../types';

export function ParishSetupScreen() {
  const insets = useSafeAreaInsets();
  const updateUser = useAuthStore((s) => s.updateUser);
  const existingUser = useAuthStore((s) => !!s.user?.birthday);

  const handleCancel = async () => {
    try {
      const fresh = await api.getMe();
      await updateUser(mapUser(fresh));
    } catch {
      // ignore — user stays on this screen
    }
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Parish[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (text: string) => {
    setQuery(text);
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
        groupCount: p.group_count ?? 0,
      })));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (parish: Parish) => {
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      await api.updateProfile({ parish_id: parish.id });
      await updateUser({ parishId: parish.id, parish: parish.name });
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
        {existingUser && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {/* ── Section header + hero ── */}
        <Text style={styles.sectionHeader}>FIND YOUR PARISH</Text>
        <Text style={styles.heroText}>Connect with{'\n'}your community.</Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Search bar (matches SearchModal pattern) ── */}
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleSearch}
            placeholder="Search by parish name or city"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
          {searching && <ActivityIndicator size="small" color={Colors.primary} style={styles.spinner} />}
        </View>

        {/* ── Results (CardList pattern) ── */}
        {results.length > 0 && (
          <>
            <Text style={styles.resultsLabel}>RESULTS</Text>
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const isFirst = index === 0;
                const isLast = index === results.length - 1;
                return (
                  <View style={[CardList.item, isFirst && CardList.itemFirst, isLast && CardList.itemLast]}>
                    <TouchableOpacity
                      style={[styles.resultRow, isLast && styles.resultRowLast]}
                      onPress={() => handleSelect(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.resultIcon}>
                        <Icon name="business-outline" size={18} color={Colors.accent} />
                      </View>
                      <View style={styles.resultText}>
                        <Text style={styles.resultName}>{item.name}</Text>
                        <Text style={styles.resultSub}>{item.city}, {item.state} · {item.memberCount} {item.memberCount === 1 ? 'parishioner' : 'parishioners'}</Text>
                      </View>
                      <Icon name="chevron-forward" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              }}
              contentContainerStyle={styles.list}
            />
          </>
        )}

        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No parishes found for &ldquo;{query}&rdquo;</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.hint}>
            You must belong to a parish to use Nave.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: Spacing[5] },
  cancelBtn: { alignSelf: 'flex-end', marginBottom: Spacing[2] },
  cancelText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: '#4b5563' },

  // ── Header (matches SearchModal) ──
  sectionHeader: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingTop: Spacing[2],
  },
  heroText: {
    fontFamily: 'CormorantGaramond-Bold',
    fontSize: 28,
    color: '#000000',
    paddingTop: Spacing[2],
    paddingBottom: Spacing[1],
  },

  // ── Error ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.error + '14',
    borderRadius: Radius.sm,
    padding: Spacing[3],
    marginTop: Spacing[3],
  },
  errorText: { color: Colors.error, fontSize: Typography.sm, flex: 1 },

  // ── Search bar (matches SearchModal) ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[3],
    marginBottom: Spacing[2],
    paddingBottom: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    paddingVertical: 0,
    height: 24,
  },
  spinner: { marginLeft: Spacing[1] },

  // ── Results (CardList pattern) ──
  resultsLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    gap: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardBorder,
  },
  resultRowLast: { borderBottomWidth: 0 },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: { flex: 1 },
  resultName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  resultSub: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },

  list: { paddingBottom: Spacing[4] },

  // ── Empty ──
  empty: { alignItems: 'center', paddingVertical: Spacing[12], paddingHorizontal: Spacing[6] },
  emptyText: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center' },

  // ── Footer ──
  footer: { marginTop: 'auto', gap: Spacing[3] },
  hint: { fontSize: Typography.xs, color: Colors.textLight, textAlign: 'center' },
});
