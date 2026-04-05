import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';

const MOCK_PARISHES = [
  { id: '1', name: 'St. Michael the Archangel', city: 'Chicago', state: 'IL', diocese: 'Archdiocese of Chicago', memberCount: 312 },
  { id: '2', name: 'Holy Family Parish', city: 'Inverness', state: 'IL', diocese: 'Archdiocese of Chicago', memberCount: 178 },
  { id: '3', name: 'Our Lady of Guadalupe', city: 'Pilsen', state: 'IL', diocese: 'Archdiocese of Chicago', memberCount: 421 },
  { id: '4', name: 'St. Patrick Cathedral', city: 'Fort Worth', state: 'TX', diocese: 'Diocese of Fort Worth', memberCount: 509 },
  { id: '5', name: 'Sacred Heart Parish', city: 'Tampa', state: 'FL', diocese: 'Diocese of St. Petersburg', memberCount: 244 },
];

const FEAST_DAYS = [
  { date: 'Mar 25', name: 'Annunciation of the Lord' },
  { date: 'Apr 3', name: 'Holy Thursday' },
  { date: 'Apr 4', name: 'Good Friday' },
  { date: 'Apr 6', name: 'Easter Sunday' },
  { date: 'Apr 23', name: 'St. George, Martyr' },
];

export function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const filtered = MOCK_PARISHES.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase()) ||
      p.diocese.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>Find parishes and dioceses near you</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search parishes, dioceses, cities..." placeholderTextColor={Colors.textLight} style={styles.searchInput} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {!search && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Feast Days</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.feastScroll}>
              {FEAST_DAYS.map((feast) => (
                <View key={feast.name} style={styles.feastCard}>
                  <Text style={styles.feastDate}>{feast.date}</Text>
                  <Text style={styles.feastName}>{feast.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{search ? `Results (${filtered.length})` : 'Featured Parishes'}</Text>
          {filtered.map((parish) => (
            <TouchableOpacity key={parish.id} style={styles.parishCard} activeOpacity={0.85}>
              <Avatar name={parish.name} size={48} />
              <View style={styles.parishInfo}>
                <Text style={styles.parishName}>{parish.name}</Text>
                <Text style={styles.parishLocation}>{parish.city}, {parish.state}</Text>
                <Text style={styles.parishDiocese} numberOfLines={1}>{parish.diocese}</Text>
              </View>
              <View style={styles.parishRight}>
                <View style={styles.memberCount}>
                  <Icon name="people-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.memberCountText}>{parish.memberCount}</Text>
                </View>
                <Icon name="chevron-forward" size={16} color={Colors.textLight} />
              </View>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <View style={styles.noResults}><Text style={styles.noResultsText}>No parishes found for "{search}"</Text></View>
          )}
        </View>

        {!search && (
          <View style={styles.calendarBanner}>
            <Text style={styles.calendarIcon}>✝️</Text>
            <View style={styles.calendarText}>
              <Text style={styles.calendarTitle}>Liturgical Season</Text>
              <Text style={styles.calendarBody}>
                We are currently in <Text style={styles.bold}>Lent</Text>, a season of prayer, fasting, and almsgiving.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing[5], paddingVertical: Spacing[4], borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[10] },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: Spacing[3], marginBottom: Spacing[5], borderWidth: 1.5, borderColor: Colors.border },
  searchIcon: { marginRight: Spacing[2] },
  searchInput: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary, paddingVertical: Spacing[3] },
  section: { marginBottom: Spacing[6] },
  sectionTitle: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[3] },
  feastScroll: { marginHorizontal: -Spacing[4] },
  feastCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing[4], marginLeft: Spacing[4], width: 150, ...Shadows.sm, borderLeftWidth: 3, borderLeftColor: Colors.accent },
  feastDate: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.accent, marginBottom: Spacing[1], textTransform: 'uppercase', letterSpacing: 0.5 },
  feastName: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary, lineHeight: Typography.sm * 1.4 },
  parishCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing[4], flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[3], ...Shadows.sm },
  parishInfo: { flex: 1 },
  parishName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: 2 },
  parishLocation: { fontSize: Typography.sm, color: Colors.textSecondary },
  parishDiocese: { fontSize: Typography.xs, color: Colors.textLight, marginTop: 2 },
  parishRight: { alignItems: 'center', gap: Spacing[1] },
  memberCount: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  memberCountText: { fontSize: Typography.xs, color: Colors.textSecondary },
  noResults: { paddingVertical: Spacing[6], alignItems: 'center' },
  noResultsText: { fontSize: Typography.base, color: Colors.textSecondary },
  calendarBanner: { backgroundColor: Colors.primary + '10', borderRadius: Radius.lg, padding: Spacing[4], flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3], borderLeftWidth: 4, borderLeftColor: Colors.primary },
  calendarIcon: { fontSize: 24, marginTop: 2 },
  calendarText: { flex: 1 },
  calendarTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.primary, marginBottom: Spacing[1] },
  calendarBody: { fontSize: Typography.sm, color: Colors.textPrimary, lineHeight: 20 },
  bold: { fontWeight: Typography.semibold },
});
