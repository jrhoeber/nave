import { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { Avatar } from '../../components/ui/Avatar';
import { AboutCard } from '../../components/profile/AboutCard';
import { SettingsModal } from '../../components/profile/SettingsModal';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { RootNavigationProp } from '../../types/navigation';

const AVATAR_SIZE = 110;
const AVATAR_BORDER = 2;
const AVATAR_GAP = 4;
const AVATAR_TOTAL = AVATAR_SIZE + (AVATAR_BORDER + AVATAR_GAP) * 2;

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 52 + insets.bottom;
  const navigation = useNavigation<RootNavigationProp>();
  const { user, updateUser, setAvatarReady } = useAuthStore();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const handleAvatarPress = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.8,
    });

    if (result.didCancel || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    setAvatarUploading(true);
    try {
      const localUri = asset.uri!;
      await updateUser({ avatarUrl: localUri });
      const updated = await api.uploadAvatar(localUri, asset.type ?? 'image/jpeg');
      if (updated.avatar_url) {
        await updateUser({ avatarUrl: updated.avatar_url });
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!user) return null;

  const parishLabel = [user.parish, user.parishCity].filter(Boolean).join(' \u00B7 ');

  return (
    <ScrollView
      testID="profile-scroll"
      style={styles.container}
      contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_HEIGHT + Spacing[6] }]}
      showsVerticalScrollIndicator={false}
      bounces
    >
      <StatusBar barStyle="dark-content" />

      {/* ── Header row ── */}
      <View style={[styles.headerRow, { paddingTop: insets.top + Spacing[3] }]}>
        <View style={{ width: 40 }} />
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setSettingsVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="ellipsis-horizontal" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Avatar with gold ring ── */}
      <View style={styles.avatarCenter}>
        <TouchableOpacity onPress={handleAvatarPress} disabled={avatarUploading} activeOpacity={0.85}>
          <View style={styles.avatarRing}>
            <Avatar uri={user.avatarUrl} name={user.displayName} size={AVATAR_SIZE} onLoad={setAvatarReady} />
          </View>
          <View style={styles.cameraBadge}>
            {avatarUploading
              ? <ActivityIndicator size="small" color={Colors.textInverse} />
              : <Icon name="camera-outline" size={14} color={Colors.textPrimary} />
            }
          </View>
        </TouchableOpacity>
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

      {/* ── Action button ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtnOutlined}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.7}
        >
          <Icon name="pencil-outline" size={16} color={Colors.textPrimary} />
          <Text style={styles.actionBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats card ── */}
      <View style={styles.statsCard}>
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>FRIENDS</Text>
          <Text style={styles.statsValueSmall}>{user.friendCount ?? 0}</Text>
        </View>

        <View style={styles.statsDivider} />

        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>GROUPS</Text>
          <Text style={styles.statsValueSmall}>{user.prayerGroupCount ?? 0}</Text>
        </View>

        <View style={styles.statsDivider} />

        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>MEMBER SINCE</Text>
          <Text style={styles.statsValueSmall}>
            {new Date(user.createdAt).getFullYear().toString()}
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
                    <Text style={styles.detailSubtitle}>{user.diocese}</Text>
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

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onBlockedUsersPress={() => {
          setSettingsVisible(false);
          setTimeout(() => navigation.navigate('BlockedUsers'), 300);
        }}
      />
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
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
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
