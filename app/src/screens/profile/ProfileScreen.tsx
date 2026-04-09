import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { RootNavigationProp } from '../../types/navigation';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const { user, logout, updateUser, setAvatarReady } = useAuthStore();
  const [avatarUploading, setAvatarUploading] = useState(false);

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
      const updated = await api.uploadAvatar(asset.uri!, asset.type ?? 'image/jpeg');
      if (updated.avatar_url) {
        await updateUser({ avatarUrl: updated.avatar_url });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!user) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Spacing[10] }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing[2] }]}>
        <Text style={styles.topBarTitle}>Profile</Text>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="settings-outline" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Identity card */}
      <View style={styles.identityCard}>
        <TouchableOpacity onPress={handleAvatarPress} disabled={avatarUploading} style={styles.avatarWrapper} activeOpacity={0.8}>
          <Avatar uri={user.avatarUrl} name={user.displayName} size={88} style={styles.avatar} onLoad={setAvatarReady} />
          <View style={styles.avatarBadge}>
            {avatarUploading
              ? <ActivityIndicator size="small" color={Colors.textInverse} />
              : <Icon name="camera" size={14} color={Colors.textInverse} />
            }
          </View>
        </TouchableOpacity>
        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>

        {user.parish && (
          <View style={styles.parishBadge}>
            <Icon name="business-outline" size={14} color={Colors.primary} />
            <Text style={styles.parishText}>{user.parish}</Text>
          </View>
        )}

        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

        <Button
          label="Edit Profile"
          variant="outline"
          size="sm"
          onPress={() => {}}
          style={styles.editBtn}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { value: user.friendCount, label: 'Friends' },
          { value: user.prayerGroupCount, label: 'Groups' },
          { value: 12, label: 'Posts' },
        ].map((stat, i) => (
          <React.Fragment key={stat.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Account settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {['Notifications', 'Privacy & Safety', 'Blocked Users', 'Help & Support', 'About Nave'].map((label) => (
          <TouchableOpacity key={label} style={styles.menuItem} activeOpacity={0.7}>
            <Text style={styles.menuLabel}>{label}</Text>
            <Icon name="chevron-forward" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.signOutSection}>
        <Button
          label="Sign Out"
          variant="outline"
          size="md"
          fullWidth
          onPress={async () => { await logout(); }}
          style={styles.signOutBtn}
          textStyle={styles.signOutText}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[3],
    backgroundColor: Colors.background,
  },
  topBarTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  identityCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing[4],
    borderRadius: Radius.xl,
    paddingVertical: Spacing[6],
    paddingHorizontal: Spacing[5],
    ...Shadows.sm,
  },
  avatarWrapper: { marginBottom: Spacing[3] },
  avatar: { borderWidth: 3, borderColor: Colors.accent },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  displayName: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[1] },
  username: { fontSize: Typography.base, color: Colors.textSecondary, marginBottom: Spacing[3] },
  parishBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.primaryLight + '22',
    borderRadius: Radius.full,
    paddingVertical: Spacing[1],
    paddingHorizontal: Spacing[3],
    marginBottom: Spacing[3],
  },
  parishText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.medium },
  bio: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.sm * 1.5,
    marginBottom: Spacing[4],
    paddingHorizontal: Spacing[2],
  },
  editBtn: { marginTop: Spacing[1] },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[4],
    borderRadius: Radius.xl,
    paddingVertical: Spacing[4],
    ...Shadows.sm,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  statLabel: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.borderLight },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[4],
    borderRadius: Radius.xl,
    padding: Spacing[4],
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing[3],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuLabel: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  signOutSection: { marginHorizontal: Spacing[4], marginTop: Spacing[4] },
  signOutBtn: { borderColor: Colors.error },
  signOutText: { color: Colors.error },
});
