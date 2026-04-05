import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { usePrayerStore } from '../../store/prayerStore';
import { Colors, Spacing, Typography } from '../../theme';
import type { PrayerGroupDetailRouteProp, RootNavigationProp } from '../../types/navigation';

export function PrayerGroupDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<PrayerGroupDetailRouteProp>();
  const { groups, joinGroup, leaveGroup } = usePrayerStore();
  const group = groups.find((g) => g.id === route.params.id);

  if (!group) {
    return (
      <View style={styles.centered}>
        <Text>Group not found.</Text>
        <Button label="Go Back" onPress={() => navigation.goBack()} variant="outline" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-back" size={22} color={Colors.textInverse} />
        </TouchableOpacity>
        <Avatar name={group.name} size={64} uri={group.avatarUrl} style={styles.groupAvatar} />
        <Text style={styles.groupName}>{group.name}</Text>
        <View style={styles.metaRow}>
          <Icon name="people-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.metaText}>{group.memberCount.toLocaleString()} members</Text>
          {group.isPrivate && (<><Text style={styles.metaDot}>·</Text><Icon name="lock-closed" size={13} color="rgba(255,255,255,0.8)" /><Text style={styles.metaText}>Private</Text></>)}
        </View>
        {group.meetingSchedule && (
          <View style={styles.scheduleRow}>
            <Icon name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.scheduleText}>{group.meetingSchedule}</Text>
          </View>
        )}
        {group.isMember ? (
          <View style={styles.heroActions}>
            <Button label="Post to Group" variant="secondary" size="sm" onPress={() => navigation.navigate('Compose', {})} style={styles.heroBtn} />
            <Button label="Leave" variant="outline" size="sm" onPress={() => leaveGroup(group.id)} style={styles.heroOutlineBtn} textStyle={styles.heroOutlineBtnText} />
          </View>
        ) : (
          <Button label="Join Group" variant="secondary" size="sm" onPress={() => joinGroup(group.id)} style={styles.joinBtn} />
        )}
      </LinearGradient>

      <View style={styles.descSection}>
        <Text style={styles.descText}>{group.description}</Text>
      </View>
      <View style={styles.postsHeader}><Text style={styles.postsTitle}>Group Posts</Text></View>
      <View style={styles.emptyPosts}>
        <Text style={styles.emptyIcon}>🙏</Text>
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptySubtitle}>{group.isMember ? 'Be the first to share a prayer or reflection.' : 'Join this group to see and share posts.'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  hero: { alignItems: 'center', padding: Spacing[5], paddingBottom: Spacing[6] },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing[3] },
  groupAvatar: { marginBottom: Spacing[3], borderWidth: 3, borderColor: Colors.accent },
  groupName: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textInverse, textAlign: 'center', marginBottom: Spacing[2] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], marginBottom: Spacing[1] },
  metaText: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.8)' },
  metaDot: { color: 'rgba(255,255,255,0.5)', marginHorizontal: Spacing[1] },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], marginBottom: Spacing[4] },
  scheduleText: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.7)' },
  heroActions: { flexDirection: 'row', gap: Spacing[3] },
  heroBtn: { backgroundColor: Colors.accent },
  heroOutlineBtn: { borderColor: 'rgba(255,255,255,0.5)' },
  heroOutlineBtnText: { color: Colors.textInverse },
  joinBtn: { backgroundColor: Colors.accent },
  descSection: { backgroundColor: Colors.surface, padding: Spacing[4], borderBottomWidth: 1, borderBottomColor: Colors.border },
  descText: { fontSize: Typography.base, color: Colors.textPrimary, lineHeight: Typography.base * Typography.relaxed },
  postsHeader: { paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border },
  postsTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  emptyPosts: { alignItems: 'center', paddingVertical: Spacing[12], paddingHorizontal: Spacing[8] },
  emptyIcon: { fontSize: 40, marginBottom: Spacing[3] },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[2] },
  emptySubtitle: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: Typography.base * Typography.normal },
});
