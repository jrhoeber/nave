import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { api, mapParish } from '../../lib/apiClient';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { Parish } from '../../types';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_POSTS = [
  {
    id: '1',
    author: 'Fr. Michael Walsh',
    content: 'This Sunday we celebrate the Fourth Sunday of Lent. Mass times are 8am, 10am, and 12pm. All are welcome.',
    type: 'announcement' as const,
    time: '2h ago',
  },
  {
    id: '2',
    author: 'Mary Kowalski',
    content: 'Please pray for my father who is undergoing surgery tomorrow morning. Your prayers mean the world to us. 🙏',
    type: 'prayer' as const,
    time: '4h ago',
  },
  {
    id: '3',
    author: 'Parish Office',
    content: 'Stations of the Cross will be held every Friday during Lent at 7pm in the main church. Come join us for this beautiful devotion.',
    type: 'announcement' as const,
    time: '1d ago',
  },
  {
    id: '4',
    author: 'Thomas Reilly',
    content: "Had a beautiful experience at the men's retreat this weekend. So grateful for this community. God is good.",
    type: 'post' as const,
    time: '2d ago',
  },
];

const MOCK_MASS_TIMES = [
  { day: 'Monday – Friday', time: '7:00 AM' },
  { day: 'Saturday (Vigil)', time: '5:00 PM' },
  { day: 'Sunday', time: '8:00 AM, 10:00 AM, 12:00 PM' },
];

const MOCK_EVENTS = [
  { date: 'Apr 7', name: 'Stations of the Cross', time: '7:00 PM' },
  { date: 'Apr 13', name: 'Palm Sunday Mass', time: '10:00 AM' },
  { date: 'Apr 17', name: 'Holy Thursday Mass', time: '7:00 PM' },
  { date: 'Apr 18', name: 'Good Friday Service', time: '3:00 PM' },
  { date: 'Apr 20', name: 'Easter Vigil', time: '8:00 PM' },
];

// ─── Parish profile modal ─────────────────────────────────────────────────────

function ParishProfileModal({ parishId, visible, onClose, onChangeParish }: {
  parishId: string;
  visible: boolean;
  onClose: () => void;
  onChangeParish: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [parish, setParish] = useState<Parish | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !parishId) return;
    setLoading(true);
    api.getParish(parishId)
      .then((data) => setParish(mapParish(data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, parishId]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[profileStyles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={profileStyles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={profileStyles.headerTitle}>Parish Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading && (
          <View style={profileStyles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {!loading && parish && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={profileStyles.scroll}>

            {/* Identity */}
            <View style={profileStyles.identitySection}>
              <View style={profileStyles.churchIcon}>
                <MCIcon name="church" size={40} color={Colors.primary} />
              </View>
              <Text style={profileStyles.parishName}>{parish.name}</Text>
              <Text style={profileStyles.diocese}>{parish.diocese}</Text>
              <View style={profileStyles.statRow}>
                <View style={profileStyles.stat}>
                  <Text style={profileStyles.statValue}>{parish.memberCount}</Text>
                  <Text style={profileStyles.statLabel}>Members</Text>
                </View>
                {parish.established && (
                  <View style={[profileStyles.stat, profileStyles.statBorder]}>
                    <Text style={profileStyles.statValue}>{parish.established}</Text>
                    <Text style={profileStyles.statLabel}>Established</Text>
                  </View>
                )}
                <View style={[profileStyles.stat, parish.established ? profileStyles.statBorder : undefined]}>
                  <Text style={profileStyles.statValue}>{new Date().getFullYear() - (parish.established ?? new Date().getFullYear())}</Text>
                  <Text style={profileStyles.statLabel}>Years</Text>
                </View>
              </View>
            </View>

            {/* Contact & Location */}
            <View style={profileStyles.section}>
              <Text style={profileStyles.sectionTitle}>Location</Text>
              <View style={profileStyles.infoCard}>
                {parish.streetAddress && (
                  <View style={profileStyles.infoRow}>
                    <Icon name="location-outline" size={18} color={Colors.primary} style={profileStyles.infoIcon} />
                    <Text style={profileStyles.infoText}>
                      {parish.streetAddress}{'\n'}{parish.city}, {parish.state} {parish.postalCode}
                    </Text>
                  </View>
                )}
                <View style={profileStyles.infoRow}>
                  <Icon name="person-outline" size={18} color={Colors.primary} style={profileStyles.infoIcon} />
                  <Text style={profileStyles.infoText}>Fr. Michael Walsh, Pastor</Text>
                </View>
                <View style={profileStyles.infoRow}>
                  <Icon name="call-outline" size={18} color={Colors.primary} style={profileStyles.infoIcon} />
                  <Text style={profileStyles.infoText}>(716) 555-0182</Text>
                </View>
                <View style={[profileStyles.infoRow, profileStyles.infoRowLast]}>
                  <Icon name="globe-outline" size={18} color={Colors.primary} style={profileStyles.infoIcon} />
                  <Text style={[profileStyles.infoText, profileStyles.infoLink]}>www.parish.org</Text>
                </View>
              </View>
            </View>

            {/* Mass Times */}
            <View style={profileStyles.section}>
              <Text style={profileStyles.sectionTitle}>Mass Times</Text>
              <View style={profileStyles.infoCard}>
                {MOCK_MASS_TIMES.map((m, i) => (
                  <View
                    key={m.day}
                    style={[profileStyles.massRow, i === MOCK_MASS_TIMES.length - 1 && profileStyles.infoRowLast]}
                  >
                    <Text style={profileStyles.massDay}>{m.day}</Text>
                    <Text style={profileStyles.massTime}>{m.time}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Upcoming Events */}
            <View style={profileStyles.section}>
              <Text style={profileStyles.sectionTitle}>Upcoming Events</Text>
              {MOCK_EVENTS.map((event) => (
                <View key={event.name} style={profileStyles.eventCard}>
                  <View style={profileStyles.eventDateBox}>
                    <Text style={profileStyles.eventDateText}>{event.date.split(' ')[0]}</Text>
                    <Text style={profileStyles.eventDateDay}>{event.date.split(' ')[1]}</Text>
                  </View>
                  <View style={profileStyles.eventInfo}>
                    <Text style={profileStyles.eventName}>{event.name}</Text>
                    <Text style={profileStyles.eventTime}>{event.time}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Change Parish */}
            <View style={profileStyles.footer}>
              <TouchableOpacity style={profileStyles.changeBtn} onPress={onChangeParish} activeOpacity={0.75}>
                <Icon name="swap-horizontal-outline" size={18} color={Colors.error} />
                <Text style={profileStyles.changeBtnText}>Change Parish</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Parish feed view ─────────────────────────────────────────────────────────

function ParishFeed({ parishId, parishName, onChangeParish }: { parishId: string; parishName: string; onChangeParish: () => void }) {
  const insets = useSafeAreaInsets();
  const [profileVisible, setProfileVisible] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.parishHeader}>
        <MCIcon name="church" size={28} color={Colors.primary} />
        <View style={styles.parishHeaderText}>
          <Text style={styles.parishName} numberOfLines={1}>{parishName}</Text>
        </View>
        <TouchableOpacity onPress={() => setProfileVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="information-circle-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.feedScroll}>
        {MOCK_POSTS.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Avatar name={post.author} size={36} />
              <View style={styles.postMeta}>
                <Text style={styles.postAuthor}>{post.author}</Text>
                <Text style={styles.postTime}>{post.time}</Text>
              </View>
              {post.type === 'announcement' && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Announcement</Text>
                </View>
              )}
              {post.type === 'prayer' && (
                <View style={[styles.badge, styles.badgePrayer]}>
                  <Text style={[styles.badgeText, styles.badgePrayerText]}>Prayer</Text>
                </View>
              )}
            </View>
            <Text style={styles.postContent}>{post.content}</Text>
          </View>
        ))}
      </ScrollView>

      <ParishProfileModal
        parishId={parishId}
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        onChangeParish={onChangeParish}
      />
    </View>
  );
}

// ─── Parish search / select view ──────────────────────────────────────────────

function ParishSelect({ onSelect }: { onSelect: (parish: Parish) => void }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Parish[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchParishes(q);
        setResults(data.parishes.map(mapParish));
      } catch {
        // ignore search errors
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    search(query);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.selectHeader}>
        <MCIcon name="church" size={32} color={Colors.primary} style={styles.selectIcon} />
        <Text style={styles.selectTitle}>Parish</Text>
        <Text style={styles.selectSubtitle}>Select a parish to connect with your community</Text>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, city..."
            placeholderTextColor={Colors.textLight}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {results.length > 0 && (
          <View style={styles.resultsList}>
            {results.map((parish, index) => (
              <TouchableOpacity
                key={parish.id}
                style={[styles.resultRow, index === results.length - 1 && styles.resultRowLast]}
                onPress={() => onSelect(parish)}
                activeOpacity={0.75}
              >
                <Avatar name={parish.name} size={40} />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{parish.name}</Text>
                  <Text style={styles.resultLocation}>{parish.city}, {parish.state}</Text>
                </View>
                <View style={styles.resultMeta}>
                  <Icon name="people-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.resultCount}>{parish.memberCount}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {query.length > 1 && !loading && results.length === 0 && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No parishes found for "{query}"</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function CommunityScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [selecting, setSelecting] = useState(false);

  const handleSelect = async (parish: Parish) => {
    try {
      await api.updateProfile({ parish_id: parish.id });
    } catch {
      // continue — update local state regardless
    }
    await updateUser({ parishId: parish.id, parish: parish.name });
  };

  const handleChangeParish = async () => {
    try {
      await api.updateProfile({ parish_id: undefined });
    } catch {
      // continue — clear local state regardless
    }
    await updateUser({ parishId: undefined, parish: undefined });
    setSelecting(true);
  };

  if (!user?.parishId || selecting) {
    return (
      <ParishSelect
        onSelect={(parish) => {
          handleSelect(parish);
          setSelecting(false);
        }}
      />
    );
  }

  return (
    <ParishFeed
      parishId={user.parishId}
      parishName={user.parish ?? user.parishId}
      onChangeParish={handleChangeParish}
    />
  );
}

// ─── Feed styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  parishHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing[3],
  },
  parishHeaderText: { flex: 1 },
  parishName: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },

  feedScroll: { padding: Spacing[4], paddingBottom: Spacing[10] },
  postCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    ...Shadows.sm,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[3], gap: Spacing[3] },
  postMeta: { flex: 1 },
  postAuthor: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  postTime: { fontSize: Typography.xs, color: Colors.textLight, marginTop: 1 },
  postContent: { fontSize: Typography.base, color: Colors.textPrimary, lineHeight: Typography.base * 1.5 },
  badge: {
    backgroundColor: Colors.primary + '18',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
  },
  badgeText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: Typography.medium },
  badgePrayer: { backgroundColor: Colors.accent + '18' },
  badgePrayerText: { color: Colors.accent },

  selectHeader: {
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[8],
    paddingBottom: Spacing[6],
    alignItems: 'center',
  },
  selectIcon: { marginBottom: Spacing[3] },
  selectTitle: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[2],
  },
  selectSubtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.base * 1.5,
  },

  searchWrapper: { paddingHorizontal: Spacing[4] },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing[2],
  },
  searchIcon: { marginRight: Spacing[2] },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    paddingVertical: Spacing[3],
  },

  resultsList: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultRowLast: { borderBottomWidth: 0 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  resultLocation: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 1 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  resultCount: { fontSize: Typography.xs, color: Colors.textSecondary },
  noResults: { paddingVertical: Spacing[5], alignItems: 'center' },
  noResultsText: { fontSize: Typography.sm, color: Colors.textSecondary },
});

// ─── Profile modal styles ─────────────────────────────────────────────────────

const profileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },

  scroll: { paddingBottom: Spacing[12] },

  identitySection: {
    alignItems: 'center',
    paddingVertical: Spacing[8],
    paddingHorizontal: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  churchIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
  },
  parishName: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing[1],
  },
  diocese: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing[5],
  },
  statRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[3],
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.primary },
  statLabel: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },

  section: { paddingHorizontal: Spacing[5], paddingTop: Spacing[6] },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing[3],
  },

  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing[3],
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoIcon: { marginTop: 1 },
  infoText: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary, lineHeight: Typography.base * 1.4 },
  infoLink: { color: Colors.primary },

  massRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  massDay: { fontSize: Typography.base, color: Colors.textPrimary },
  massTime: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.primary },

  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventDateBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDateText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.primary, textTransform: 'uppercase' },
  eventDateDay: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.primary, lineHeight: Typography.lg },
  eventInfo: { flex: 1 },
  eventName: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  eventTime: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 1 },

  footer: { paddingHorizontal: Spacing[5], paddingTop: Spacing[8], paddingBottom: Spacing[6] },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[4],
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.error + '50',
    backgroundColor: Colors.error + '08',
  },
  changeBtnText: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.error },
});
