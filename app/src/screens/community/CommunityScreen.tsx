import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

// ─── Parish profile modal ─────────────────────────────────────────────────────

function ParishProfileModal({ parish, visible, onClose, onChangeParish }: {
  parish: Parish | null;
  visible: boolean;
  onClose: () => void;
  onChangeParish: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <View style={profileStyles.container}>

        {!parish && (
          <View style={profileStyles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {parish && (
          <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={profileStyles.scroll}>

            {/* Hero */}
            <View style={profileStyles.hero}>
              <TouchableOpacity
                style={[profileStyles.closeBtn, { top: insets.top + 12 }]}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={20} color={Colors.textInverse} />
              </TouchableOpacity>

              <View style={profileStyles.heroInner}>
                <View style={profileStyles.churchIconRing}>
                  <MCIcon name="church" size={28} color={Colors.accent} />
                </View>
                <Text style={profileStyles.parishName}>{parish.name}</Text>
                <View style={profileStyles.goldRule} />
                <Text style={profileStyles.diocese}>{parish.diocese}</Text>
                {parish.established && (
                  <Text style={profileStyles.established}>Est. {parish.established}</Text>
                )}
                {parish.streetAddress && (
                  <Text style={profileStyles.address}>
                    {parish.streetAddress}{'\n'}{parish.city}, {parish.state}{parish.postalCode ? ` ${parish.postalCode}` : ''}
                  </Text>
                )}
              </View>

              <View style={profileStyles.memberPill}>
                <Icon name="people" size={13} color={Colors.accent} />
                <Text style={profileStyles.memberPillText}>{parish.memberCount} members</Text>
              </View>
            </View>

            {/* Mass Schedule */}
            <View style={profileStyles.section}>
              <View style={profileStyles.sectionHeader}>
                <View style={profileStyles.sectionAccent} />
                <Text style={profileStyles.sectionTitle}>Mass Schedule</Text>
              </View>
              {parish.massSchedule && parish.massSchedule.length > 0 ? (
                <View style={profileStyles.scheduleCard}>
                  {parish.massSchedule.map((entry, i) => (
                    <View
                      key={entry.day}
                      style={[
                        profileStyles.massRow,
                        i === parish.massSchedule!.length - 1 && profileStyles.massRowLast,
                      ]}
                    >
                      <Text style={profileStyles.massDay}>{entry.day}</Text>
                      <View style={profileStyles.massDot} />
                      <Text style={profileStyles.massTime}>{entry.times.join('  ·  ')}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={profileStyles.emptySchedule}>
                  <Icon name="globe-outline" size={16} color={Colors.textLight} />
                  <Text style={profileStyles.massEmptyText}>Visit parish website for mass schedule</Text>
                </View>
              )}
            </View>

            {/* Change Parish */}
            <TouchableOpacity style={profileStyles.changeBtn} onPress={onChangeParish} activeOpacity={0.7}>
              <Icon name="swap-horizontal-outline" size={15} color={Colors.error} />
              <Text style={profileStyles.changeBtnText}>Change Parish</Text>
            </TouchableOpacity>

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
  const [parish, setParish] = useState<Parish | null>(null);

  useEffect(() => {
    api.getParish(parishId)
      .then((data) => setParish(mapParish(data)))
      .catch(() => {});
  }, [parishId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.feedScroll}>

        {/* Cover photo */}
        {parish?.coverPhotoUrl ? (
          <Image source={{ uri: parish.coverPhotoUrl }} style={styles.coverPhoto} resizeMode="cover" />
        ) : (
          <View style={styles.coverPhotoPlaceholder}>
            <MCIcon name="church" size={48} color={Colors.primary + '60'} />
          </View>
        )}

        {/* Identity */}
        <View style={styles.parishIdentity}>
          <View style={styles.parishIdentityText}>
            <Text style={styles.parishName} numberOfLines={2}>{parishName}</Text>
            {parish?.established && (
              <Text style={styles.parishEstablished}>Est. {parish.established}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => setProfileVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="information-circle-outline" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Posts */}
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
        parish={parish}
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

        {query.length === 0 && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome to Nave!</Text>
            <Text style={styles.welcomeSubtitle}>Join a parish to stay connected</Text>
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

  coverPhoto: {
    width: '100%',
    height: 180,
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parishIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[3],
  },
  parishIdentityText: { flex: 1 },
  parishName: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  parishEstablished: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.medium, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing[5] },

  feedScroll: { paddingBottom: Spacing[10] },
  postCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
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
  welcomeContainer: { alignItems: 'center', paddingTop: Spacing[8] },
  welcomeTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[2] },
  welcomeSubtitle: { fontSize: Typography.base, color: Colors.textSecondary },

  noResults: { paddingVertical: Spacing[5], alignItems: 'center' },
  noResultsText: { fontSize: Typography.sm, color: Colors.textSecondary },
});

// ─── Profile modal styles ─────────────────────────────────────────────────────

const profileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: Spacing[12] },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: Colors.primaryDark,
    paddingBottom: Spacing[6],
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing[5],
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInner: {
    alignItems: 'center',
    paddingTop: Spacing[16],
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[5],
  },
  churchIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: Colors.accent + '60',
    backgroundColor: Colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
  },
  parishName: {
    fontFamily: Typography.fontSerif,
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: Typography['3xl'] * 1.2,
    marginBottom: Spacing[4],
  },
  goldRule: {
    width: 48,
    height: 1.5,
    backgroundColor: Colors.accent,
    marginBottom: Spacing[4],
  },
  diocese: {
    fontSize: Typography.base,
    color: 'rgba(255,255,255,0.80)',
    letterSpacing: 0.3,
    marginBottom: Spacing[2],
    textAlign: 'center',
  },
  established: {
    fontSize: Typography.sm,
    color: Colors.accentLight,
    fontWeight: Typography.medium,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing[3],
  },
  address: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: Typography.sm * 1.7,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.accent + '60',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  memberPillText: {
    fontSize: Typography.sm,
    color: Colors.accentLight,
    fontWeight: Typography.medium,
  },

  // ── Mass Schedule ─────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[7],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scheduleCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  massRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing[3],
  },
  massRowLast: { borderBottomWidth: 0 },
  massDay: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.textPrimary,
    flex: 1,
  },
  massDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent + '80',
  },
  massTime: {
    fontSize: Typography.base,
    color: Colors.primary,
    fontWeight: Typography.semibold,
    textAlign: 'right',
  },
  emptySchedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[2],
  },
  massEmptyText: {
    fontSize: Typography.sm,
    color: Colors.textLight,
    fontStyle: 'italic',
  },

  // ── Change Parish ─────────────────────────────────────────────────────────
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    marginHorizontal: Spacing[5],
    marginTop: Spacing[8],
    paddingVertical: Spacing[3] + 2,
  },
  changeBtnText: {
    fontSize: Typography.sm,
    color: Colors.error,
    fontWeight: Typography.medium,
  },
});
