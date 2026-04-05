import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { PrayerGroup, PrayerGroupCategory } from '../../types';

interface PrayerGroupCardProps {
  group: PrayerGroup;
  onPress: (id: string) => void;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
}

const CATEGORY_CONFIG: Record<PrayerGroupCategory, { label: string; icon: string; color: string }> = {
  rosary:         { label: 'Rosary',          icon: 'ellipse-outline',    color: '#7c3aed' },
  scripture_study:{ label: 'Scripture Study', icon: 'book-outline',       color: Colors.success },
  mens_group:     { label: "Men's Group",     icon: 'shield-outline',     color: Colors.primary },
  womens_group:   { label: "Women's Group",   icon: 'flower-outline',     color: '#ec4899' },
  youth:          { label: 'Youth',           icon: 'happy-outline',      color: '#f59e0b' },
  young_adults:   { label: 'Young Adults',    icon: 'people-outline',     color: Colors.info },
  families:       { label: 'Families',        icon: 'home-outline',       color: Colors.accentDark },
  devotional:     { label: 'Devotional',      icon: 'heart-outline',      color: '#e11d48' },
  general:        { label: 'General',         icon: 'chatbubbles-outline', color: Colors.textSecondary },
};

export function PrayerGroupCard({ group, onPress, onJoin, onLeave }: PrayerGroupCardProps) {
  const cat = CATEGORY_CONFIG[group.category];

  return (
    <TouchableOpacity onPress={() => onPress(group.id)} activeOpacity={0.97} style={styles.card}>
      <View style={styles.header}>
        <Avatar name={group.name} size={52} uri={group.avatarUrl} />
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
            {group.isPrivate && <Icon name="lock-closed" size={13} color={Colors.textSecondary} style={styles.lockIcon} />}
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: cat.color + '18' }]}>
            <Icon name={cat.icon} size={11} color={cat.color} />
            <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>{group.description}</Text>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Icon name="people-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{group.memberCount.toLocaleString()} members</Text>
        </View>
        {group.meetingSchedule && (
          <View style={styles.metaItem}>
            <Icon name="time-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>{group.meetingSchedule}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {group.isMember ? (
          <View style={styles.memberRow}>
            <View style={styles.memberBadge}>
              <Icon name="checkmark-circle" size={15} color={Colors.success} />
              <Text style={styles.memberText}>Member</Text>
            </View>
            <Button label="Leave" variant="ghost" size="sm" onPress={() => onLeave(group.id)}
              textStyle={styles.leaveText} />
          </View>
        ) : (
          <Button
            label={group.isPendingApproval ? 'Requested' : 'Join Group'}
            variant={group.isPendingApproval ? 'outline' : 'primary'}
            size="sm"
            disabled={group.isPendingApproval}
            onPress={() => onJoin(group.id)}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing[4], marginBottom: Spacing[3], ...Shadows.sm },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[3], gap: Spacing[3] },
  info: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[1] },
  name: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textPrimary, flex: 1 },
  lockIcon: { marginLeft: Spacing[1] },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: Spacing[2], paddingVertical: 3, borderRadius: Radius.full, gap: 3 },
  categoryLabel: { fontSize: Typography.xs, fontWeight: Typography.medium },
  description: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: Typography.sm * Typography.normal, marginBottom: Spacing[3] },
  meta: { gap: Spacing[1], marginBottom: Spacing[3] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1] },
  metaText: { fontSize: Typography.xs, color: Colors.textSecondary },
  footer: { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing[3] },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1] },
  memberText: { fontSize: Typography.sm, color: Colors.success, fontWeight: Typography.medium },
  leaveText: { color: Colors.textSecondary, fontSize: Typography.sm },
});
