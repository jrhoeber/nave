import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { RootNavigationProp } from '../../types/navigation';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const { user, logout } = useAuthStore();

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing[10] }} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={[styles.hero, { paddingTop: insets.top + Spacing[4] }]}>
        <View style={styles.heroActions}>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="settings-outline" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
        <Avatar uri={user.avatarUrl} name={user.displayName} size={88} style={styles.avatar} />
        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
        <View style={styles.statsRow}>
          {[{ value: user.friendCount, label: 'Friends' }, { value: user.prayerGroupCount, label: 'Prayer Groups' }, { value: 12, label: 'Posts' }].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.stat}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
        <Button label="Edit Profile" variant="outline" size="sm" onPress={() => {}}
          style={styles.editBtn} textStyle={styles.editBtnText} />
      </LinearGradient>

      {(user.parish || user.diocese) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parish & Diocese</Text>
          {user.parish && (
            <View style={styles.infoRow}>
              <Icon name="business-outline" size={18} color={Colors.primary} />
              <View><Text style={styles.infoLabel}>Parish</Text><Text style={styles.infoValue}>{user.parish}</Text></View>
            </View>
          )}
          {user.diocese && (
            <View style={styles.infoRow}>
              <Icon name="map-outline" size={18} color={Colors.primary} />
              <View><Text style={styles.infoLabel}>Diocese</Text><Text style={styles.infoValue}>{user.diocese}</Text></View>
            </View>
          )}
        </View>
      )}

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
        <Button label="Sign Out" variant="outline" size="md" fullWidth
          onPress={async () => { await logout(); }}
          style={styles.signOutBtn} textStyle={styles.signOutText} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { alignItems: 'center', paddingHorizontal: Spacing[5], paddingBottom: Spacing[6] },
  heroActions: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-end', marginBottom: Spacing[3] },
  avatar: { marginBottom: Spacing[3], borderWidth: 3, borderColor: Colors.accent },
  displayName: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textInverse, marginBottom: Spacing[1] },
  username: { fontSize: Typography.base, color: 'rgba(255,255,255,0.7)', marginBottom: Spacing[3] },
  bio: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: Typography.sm * Typography.normal, marginBottom: Spacing[4], paddingHorizontal: Spacing[4] },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.lg, paddingVertical: Spacing[3], paddingHorizontal: Spacing[6], gap: Spacing[6], marginBottom: Spacing[4] },
  stat: { alignItems: 'center' },
  statValue: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textInverse },
  statLabel: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  editBtn: { borderColor: 'rgba(255,255,255,0.5)', paddingHorizontal: Spacing[6] },
  editBtnText: { color: Colors.textInverse },
  section: { backgroundColor: Colors.surface, marginHorizontal: Spacing[4], marginTop: Spacing[4], borderRadius: Radius.lg, padding: Spacing[4], ...Shadows.sm },
  sectionTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing[3] },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3], paddingVertical: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoLabel: { fontSize: Typography.xs, color: Colors.textSecondary },
  infoValue: { fontSize: Typography.base, color: Colors.textPrimary, fontWeight: Typography.medium },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  menuLabel: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  signOutSection: { marginHorizontal: Spacing[4], marginTop: Spacing[4] },
  signOutBtn: { borderColor: Colors.error },
  signOutText: { color: Colors.error },
});
