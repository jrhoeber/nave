import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import type { UserProfileRouteProp } from '../../types/navigation';

const MOCK_OTHER_USER = {
  id: '2', username: 'sister_teresa', displayName: 'Sister Teresa',
  bio: 'Servant of God. Praying for you all. 🙏',
  avatarUrl: 'https://i.pravatar.cc/150?img=5',
  parish: 'Holy Family Parish', diocese: 'Archdiocese of Chicago',
  friendCount: 142, prayerGroupCount: 5, createdAt: new Date().toISOString(), isFriend: false,
};

export function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<UserProfileRouteProp>();
  const currentUser = useAuthStore((s) => s.user);

  const isOwnProfile = route.params.id === currentUser?.id;
  const user = isOwnProfile ? currentUser! : MOCK_OTHER_USER;

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-back" size={22} color={Colors.textInverse} />
        </TouchableOpacity>
        <Avatar uri={user.avatarUrl} name={user.displayName} size={80} style={styles.avatar} />
        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statValue}>{user.friendCount}</Text><Text style={styles.statLabel}>Friends</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{user.prayerGroupCount}</Text><Text style={styles.statLabel}>Prayer Groups</Text></View>
        </View>
        {!isOwnProfile && (
          <View style={styles.actions}>
            <Button label={user.isFriend ? 'Friends' : 'Add Friend'} variant={user.isFriend ? 'outline' : 'secondary'} size="sm" onPress={() => {}} style={styles.outlineBtn} textStyle={styles.outlineBtnText} />
            <Button label="Message" variant="outline" size="sm" onPress={() => {}} style={styles.outlineBtn} textStyle={styles.outlineBtnText} />
          </View>
        )}
      </LinearGradient>

      {(user.parish || user.diocese) && (
        <View style={styles.infoCard}>
          {user.parish && <View style={styles.infoRow}><Icon name="business-outline" size={16} color={Colors.primary} /><Text style={styles.infoText}>{user.parish}</Text></View>}
          {user.diocese && <View style={styles.infoRow}><Icon name="map-outline" size={16} color={Colors.primary} /><Text style={styles.infoText}>{user.diocese}</Text></View>}
        </View>
      )}

      <View style={styles.emptyPosts}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyText}>No posts yet</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { alignItems: 'center', padding: Spacing[5], paddingBottom: Spacing[6] },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing[3] },
  avatar: { marginBottom: Spacing[3], borderWidth: 3, borderColor: Colors.accent },
  displayName: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textInverse, marginBottom: Spacing[1] },
  username: { fontSize: Typography.base, color: 'rgba(255,255,255,0.7)', marginBottom: Spacing[2] },
  bio: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing[4], marginBottom: Spacing[4] },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingVertical: Spacing[3], paddingHorizontal: Spacing[8], gap: Spacing[8], marginBottom: Spacing[4] },
  stat: { alignItems: 'center' },
  statValue: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textInverse },
  statLabel: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  actions: { flexDirection: 'row', gap: Spacing[3] },
  outlineBtn: { borderColor: 'rgba(255,255,255,0.5)' },
  outlineBtnText: { color: Colors.textInverse },
  infoCard: { margin: Spacing[4], backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing[4], gap: Spacing[2] },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  infoText: { fontSize: Typography.base, color: Colors.textPrimary },
  emptyPosts: { alignItems: 'center', paddingVertical: Spacing[12] },
  emptyIcon: { fontSize: 36, marginBottom: Spacing[2] },
  emptyText: { fontSize: Typography.base, color: Colors.textSecondary },
});
