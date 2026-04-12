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
  /** Button rendered in the top-right/left of the hero (gear icon or back chevron) */
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
  const hasMetaBelow = user.parish || user.location;
  const hasBio = !!user.bio;

  return (
    <ScrollView
      testID={testID}
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Spacing[12] }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />

      {/* ── Navy hero panel ── */}
      <View style={[styles.hero, { paddingTop }]}>
        {headerSlot}
        <View style={styles.heroRule} />
      </View>

      {/* ── Avatar — floats at the hero/content boundary ── */}
      <View style={styles.avatarAnchor}>
        {avatarSlot}
      </View>

      {/* ── Identity content ── */}
      <View style={styles.identity}>
        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>

        {hasMetaBelow && (
          <View style={styles.metaBlock}>
            {user.parish && (
              <View style={styles.parishPill}>
                <Icon name="business-outline" size={12} color={Colors.accent} />
                <Text style={styles.parishText} numberOfLines={1}>{user.parish}</Text>
              </View>
            )}
            {user.location && (
              <View style={styles.locationRow}>
                <Icon name="location-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.locationText}>{user.location}</Text>
              </View>
            )}
          </View>
        )}

        {hasBio && (
          <>
            <View style={styles.ornament}>
              <View style={styles.ornamentLine} />
              <View style={styles.ornamentDot} />
              <View style={styles.ornamentDot} />
              <View style={styles.ornamentDot} />
              <View style={styles.ornamentLine} />
            </View>
            <Text style={styles.bio}>{user.bio}</Text>
          </>
        )}

        {actionSlot}
      </View>

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
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    marginTop: Spacing[1],
    minWidth: 140,
    justifyContent: 'center',
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
  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing[5],
    paddingBottom: AVATAR_TOTAL / 2 + Spacing[6],
  },
  heroRule: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.accent,
    opacity: 0.5,
  },
  avatarAnchor: {
    alignItems: 'center',
    marginTop: -(AVATAR_TOTAL / 2),
    zIndex: 10,
    marginBottom: Spacing[2],
  },
  avatarRing: {
    width: AVATAR_TOTAL,
    height: AVATAR_TOTAL,
    borderRadius: AVATAR_TOTAL / 2,
    borderWidth: AVATAR_BORDER,
    borderColor: Colors.accent,
    backgroundColor: Colors.primary,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  identity: {
    alignItems: 'center',
    paddingHorizontal: Spacing[6],
  },
  displayName: {
    fontFamily: Typography.fontSerif,
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  username: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'lowercase',
    marginBottom: Spacing[4],
  },
  metaBlock: {
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  parishPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.accent + '18',
    borderWidth: 1,
    borderColor: Colors.accent + '40',
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: Spacing[3],
  },
  parishText: {
    fontSize: Typography.sm,
    color: Colors.accentDark,
    fontWeight: Typography.semibold,
    letterSpacing: 0.2,
    maxWidth: 240,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  locationText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    letterSpacing: 0.1,
  },
  ornament: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[4],
    width: '60%',
  },
  ornamentLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.accent,
    opacity: 0.35,
  },
  ornamentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    opacity: 0.6,
  },
  bio: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.base * Typography.relaxed,
    marginBottom: Spacing[6],
    paddingHorizontal: Spacing[5],
  },
});
