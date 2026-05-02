import { ReactNode } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Avatar } from '../ui/Avatar';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { User } from '../../types';

export const AVATAR_SIZE = 100;
export const AVATAR_BORDER = 4;
export const AVATAR_TOTAL = AVATAR_SIZE + AVATAR_BORDER * 2;

interface ProfileViewProps {
  user: User;
  paddingTop: number;
  /** Button rendered in the top-right/left of the header (gear icon or back chevron) */
  headerSlot: ReactNode;
  /** Full avatar area rendered inside avatarAnchor (ring + optional badge) */
  avatarSlot: ReactNode;
  /** Bottom action button (Edit Profile, Add Friend, Remove Friend, etc.) */
  actionSlot: ReactNode;
  /** Modals or other invisible elements appended after scroll content */
  footerSlot?: ReactNode;
  testID?: string;
}

export function ProfileView({
  user,
  paddingTop,
  headerSlot,
  avatarSlot,
  actionSlot,
  footerSlot,
  testID,
}: ProfileViewProps) {
  const hasParish = !!user.parish;
  const hasLocation = !!user.location;
  const hasBio = !!user.bio;

  return (
    <ScrollView
      testID={testID}
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      bounces
    >
      <StatusBar barStyle="dark-content" />

      {/* ── Top row: title + header action ── */}
      <View style={[styles.topRow, { paddingTop }]}>
        <Text style={styles.screenTitle}>Profile</Text>
        {headerSlot}
      </View>

      {/* ── Avatar — centered ── */}
      <View style={styles.avatarAnchor}>
        {avatarSlot}
      </View>

      {/* ── Display name ── */}
      <Text style={styles.displayName}>{user.displayName}</Text>

      {/* ── Username ── */}
      <Text style={styles.username}>@{user.username}</Text>

      {/* ── Action button ── */}
      <View style={styles.actionRow}>
        {actionSlot}
      </View>

      {/* ── Bio card ── */}
      {hasBio && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ABOUT</Text>
          <Text style={styles.bioText}>{user.bio}</Text>
        </View>
      )}

      {/* ── Details card (parish + location) ── */}
      {(hasParish || hasLocation) && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>DETAILS</Text>
          {hasParish && (
            <View style={styles.detailRow}>
              <Icon name="business-outline" size={15} color={Colors.accent} />
              <Text style={styles.detailText} numberOfLines={1}>{user.parish}</Text>
            </View>
          )}
          {hasParish && hasLocation && <View style={styles.detailDivider} />}
          {hasLocation && (
            <View style={styles.detailRow}>
              <Icon name="location-outline" size={15} color={Colors.accent} />
              <Text style={styles.detailText}>{user.location}</Text>
            </View>
          )}
        </View>
      )}

      {footerSlot}
    </ScrollView>
  );
}

/** Reusable avatar ring — wrap in TouchableOpacity or View depending on the screen */
export function AvatarRing({ uri, name, onLoad }: { uri?: string; name: string; onLoad?: () => void }) {
  return (
    <View style={styles.avatarRing}>
      <Avatar uri={uri} name={name} size={AVATAR_SIZE} onLoad={onLoad} />
    </View>
  );
}

export const profileStyles = StyleSheet.create({
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
    ...Shadows.sm,
  },
  heroBtn: {
    marginBottom: Spacing[2],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    alignSelf: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent + '50',
    paddingBottom: 4,
  },
  actionBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    letterSpacing: 0.4,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[12],
  },

  // ── Top row ───────────────────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[5],
  },
  screenTitle: {
    fontFamily: Typography.fontSans,
    fontSize: 30,
    fontWeight: Typography.semibold,
    color: '#1a1a1a',
    letterSpacing: -0.8,
  },

  // ── Avatar ────────────────────────────────────────────────────────────────
  avatarAnchor: {
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
    overflow: 'hidden',
    ...Shadows.lg,
  },

  // ── Identity ──────────────────────────────────────────────────────────────
  displayName: {
    fontFamily: Typography.fontSerif,
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: Typography['3xl'] * 1.15,
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  username: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'lowercase',
    textAlign: 'center',
    marginBottom: Spacing[5],
  },

  // ── Action row ────────────────────────────────────────────────────────────
  actionRow: {
    alignItems: 'center',
    marginBottom: Spacing[7],
  },

  // ── Cards (matching parish profile modal) ─────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent + '50',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    marginBottom: Spacing[4],
  },
  cardLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: Spacing[3],
  },
  bioText: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    lineHeight: Typography.base * 1.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[2],
  },
  detailText: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
});
