import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { AboutCard } from '../../components/profile/AboutCard';
import { useFriendsStore } from '../../store/friendsStore';
import { useBlocksStore } from '../../store/blocksStore';
import { useAuthStore } from '../../store/authStore';
import { api, mapUser } from '../../lib/apiClient';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { User, MutualFriendBrief } from '../../types';
import type { UserProfileRouteProp } from '../../types/navigation';

const AVATAR_SIZE = 110;
const AVATAR_BORDER = 2;
const AVATAR_GAP = 4;
const AVATAR_TOTAL = AVATAR_SIZE + (AVATAR_BORDER + AVATAR_GAP) * 2;
const MUTUAL_AVATAR_SIZE = 28;

function formatFriendsSince(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const year = d.getFullYear();
  const month = months[d.getMonth()];
  return `${month} ${year}`;
}

export function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<UserProfileRouteProp>();
  const { friends, removeFriend } = useFriendsStore();
  const { blockUser } = useBlocksStore();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const friendship = friends.find((f) => f.user.id === route.params.id);
  const isFriend = !!friendship;
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isSelf = currentUserId === route.params.id;

  useEffect(() => {
    (async () => {
      try {
        const raw = await api.getUser(route.params.id);
        const mapped = mapUser(raw);
        setUser(mapped);
        setIsPending(!!mapped.isPendingFriend);
      } catch {
        Alert.alert('Error', 'Could not load profile.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [route.params.id]);

  const handleRemoveFriend = async () => {
    if (!friendship) return;
    setActionLoading(true);
    try {
      await removeFriend(friendship.id);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not remove friend. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      await api.sendFriendRequest(route.params.id);
      setIsPending(true);
    } catch {
      Alert.alert('Error', 'Could not send friend request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = () => {
    Alert.alert(
      `Block ${user?.displayName ?? 'User'}`,
      'They won\'t be able to see your profile or send you friend requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(route.params.id);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Could not block user. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleKebabPress = () => {
    Alert.alert(
      user?.displayName ?? 'User',
      undefined,
      [
        { text: 'Block User', style: 'destructive', onPress: handleBlockUser },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  // ── Loading state ──
  if (loading || !user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 100 }} />
      </View>
    );
  }

  const parishLabel = [user.parish, user.parishCity].filter(Boolean).join(' \u00B7 ');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      bounces
    >
      <StatusBar barStyle="dark-content" />

      {/* ── Header row ── */}
      <View style={[styles.headerRow, { paddingTop: insets.top + Spacing[3] }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        {!isSelf && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleKebabPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="ellipsis-horizontal" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Avatar with gold ring ── */}
      <View style={styles.avatarCenter}>
        <View style={styles.avatarRing}>
          <Avatar uri={user.avatarUrl} name={user.displayName} size={AVATAR_SIZE} />
        </View>
        {/* + button overlay */}
        {!isSelf && !isFriend && !isPending && (
          <TouchableOpacity
            style={styles.addBadge}
            onPress={handleAddFriend}
            disabled={actionLoading}
          >
            <Icon name="add" size={18} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Name ── */}
      <Text style={styles.displayName}>{user.displayName}</Text>

      {/* ── Username ── */}
      <Text style={styles.username}>@{user.username}</Text>

      {/* ── Gold divider ── */}
      <View style={styles.goldDivider} />

      {/* ── Parish label ── */}
      {!!parishLabel && (
        <Text style={styles.parishLabel}>{parishLabel.toUpperCase()}</Text>
      )}

      {/* ── Action buttons ── */}
      {!isSelf && (
      <View style={styles.actionRow}>
        {isFriend ? (
          <TouchableOpacity
            style={styles.actionBtnOutlined}
            onPress={handleRemoveFriend}
            disabled={actionLoading}
            activeOpacity={0.7}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <>
                <Icon name="checkmark" size={16} color={Colors.textPrimary} />
                <Text style={styles.actionBtnText}>Friends</Text>
              </>
            )}
          </TouchableOpacity>
        ) : isPending ? (
          <View style={[styles.actionBtnOutlined, { opacity: 0.5 }]}>
            <Icon name="time-outline" size={16} color={Colors.textSecondary} />
            <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>Pending</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.actionBtnOutlined}
            onPress={handleAddFriend}
            disabled={actionLoading}
            activeOpacity={0.7}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <>
                <Icon name="person-add-outline" size={16} color={Colors.textPrimary} />
                <Text style={styles.actionBtnText}>Add Friend</Text>
              </>
            )}
          </TouchableOpacity>
        )}

      </View>
      )}

      {/* ── Stats card ── */}
      <View style={styles.statsCard}>
          {/* Together In */}
          <View style={styles.statsCol}>
            <Text style={styles.statsLabel}>TOGETHER IN</Text>
            <Text style={styles.statsValueSmall}>{user.sharedGroupCount ?? 0}</Text>
            <Text style={styles.statsSubtext}>groups</Text>
          </View>

          <View style={styles.statsDivider} />

          {/* Mutuals */}
          <View style={styles.statsCol}>
            <Text style={styles.statsLabel}>MUTUALS</Text>
            <Text style={styles.statsValueSmall}>{user.mutualFriendCount ?? 0}</Text>
            <Text style={styles.statsSubtext}>friends</Text>
          </View>

          <View style={styles.statsDivider} />

          {/* Friends/Member Since */}
          <View style={styles.statsCol}>
            <Text style={styles.statsLabel}>{isFriend ? 'FRIENDS SINCE' : 'MEMBER SINCE'}</Text>
            <Text style={styles.statsValueSmall}>
              {isFriend
                ? formatFriendsSince(user.friendshipCreatedAt)
                : new Date(user.createdAt).getFullYear().toString()}
            </Text>
          </View>
      </View>

      {/* ── About ── */}
      {!!user.bio && <AboutCard bio={user.bio} />}

      {/* ── Details ── */}
      {(!!user.parish || !!user.location) && (
        <>
          <Text style={styles.sectionLabel}>DETAILS</Text>
          <View style={styles.detailsCard}>
            {!!user.parish && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Icon name="home-outline" size={18} color={Colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailTitle}>{user.parish}</Text>
                  {!!user.diocese && (
                    <Text style={styles.detailSubtitle}>
                      {[user.diocese].filter(Boolean).join(' \u00B7 ')}
                    </Text>
                  )}
                </View>
              </View>
            )}
            {!!user.parish && !!user.location && <View style={styles.detailSep} />}
            {!!user.location && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Icon name="location-outline" size={18} color={Colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailTitle}>{user.location}</Text>
                </View>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
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

  // ── Header ──
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[4],
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Avatar ──
  avatarCenter: {
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  avatarRing: {
    width: AVATAR_TOTAL,
    height: AVATAR_TOTAL,
    borderRadius: AVATAR_TOTAL / 2,
    borderWidth: AVATAR_BORDER,
    borderColor: Colors.accent,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: '50%',
    marginRight: -AVATAR_TOTAL / 2 + 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
    ...Shadows.sm,
  },

  // ── Identity ──
  displayName: {
    fontFamily: 'CormorantGaramond-Regular',
    fontSize: Typography['3xl'],
    color: '#000000',
    lineHeight: Typography['3xl'] * 1.15,
    textAlign: 'center',
    marginBottom: Spacing[1],
  },
  username: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'lowercase',
    textAlign: 'center',
    marginBottom: Spacing[3],
  },
  goldDivider: {
    width: 28,
    height: 2.5,
    backgroundColor: Colors.accent,
    alignSelf: 'center',
    borderRadius: 2,
    marginBottom: Spacing[3],
  },
  parishLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    letterSpacing: 1.8,
    textAlign: 'center',
    marginBottom: Spacing[5],
  },

  // ── Action buttons ──
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing[3],
    marginBottom: Spacing[6],
    paddingHorizontal: Spacing[6],
  },
  actionBtnOutlined: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[2] + 2,
    paddingHorizontal: Spacing[5],
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  actionBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },

  // ── Stats card ──
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing[5],
    borderRadius: Radius.md,
    paddingVertical: Spacing[4],
    marginBottom: Spacing[6],
    ...Shadows.sm,
  },
  statsCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
  },
  statsDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing[1],
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.accent,
    letterSpacing: 1.2,
    marginBottom: Spacing[2],
  },
  statsValueSmall: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 2,
  },
  statsSubtext: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  mutualAvatars: {
    flexDirection: 'row',
    marginBottom: Spacing[1],
  },
  mutualAvatarWrap: {
    width: MUTUAL_AVATAR_SIZE,
    height: MUTUAL_AVATAR_SIZE,
    borderRadius: MUTUAL_AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.surface,
    overflow: 'hidden',
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: Spacing[3],
    marginHorizontal: Spacing[6],
  },

  // ── Details card ──
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[6],
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    gap: Spacing[3],
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  detailSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing[4],
  },
});
