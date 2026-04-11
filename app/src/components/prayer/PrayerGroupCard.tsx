import React, { useRef, useState } from 'react';
import { Alert, Dimensions, Modal, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { PrayerGroup, PrayerGroupCategory } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface PrayerGroupCardProps {
  group: PrayerGroup;
  onPress: (id: string) => void;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  unreadCount?: number;
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

function UnreadBadge({ count }: { count: number }) {
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={[styles.badge, label.length > 2 && styles.badgeWide]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function PrayerGroupCard({ group, onPress, onJoin, onLeave, onEdit, onDelete, unreadCount = 0 }: PrayerGroupCardProps) {
  const cat = CATEGORY_CONFIG[group.category];
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isAdmin = group.admin.id === currentUserId;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const kebabRef = useRef<TouchableOpacity>(null);

  const handleKebabPress = () => {
    kebabRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      const windowWidth = Dimensions.get('window').width;
      setMenuPos({ top: pageY + height + 4, right: windowWidth - pageX - width });
      setMenuOpen(true);
    });
  };

  return (
    <TouchableOpacity onPress={() => onPress(group.id)} activeOpacity={0.97} style={styles.card} testID={`group-card-${group.id}`}>
      {group.isMember && (
        <View style={styles.kebabContainer} onStartShouldSetResponder={() => true}>
          <TouchableOpacity
            ref={kebabRef}
            onPress={handleKebabPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="ellipsis-horizontal" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.row}>
        <Avatar name={group.name} size={42} uri={group.avatarUrl} />
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
            {unreadCount > 0 && <UnreadBadge count={unreadCount} />}
          </View>
          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: cat.color + '18' }]}>
              <Icon name={cat.icon} size={10} color={cat.color} />
              <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
            </View>
            <View style={styles.memberCount}>
              <Icon name="people-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.memberText}>{group.memberCount.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.pillRow}>
            {group.parish && (
              <View style={styles.parishPill}>
                <Icon name="business-outline" size={10} color={Colors.primary} />
                <Text style={styles.parishPillText} numberOfLines={1}>{group.parish}</Text>
              </View>
            )}
            {!group.parish && (
              <View style={styles.privatePill}>
                <Icon name="lock-closed" size={10} color={Colors.textSecondary} />
                <Text style={styles.privatePillText}>Private</Text>
              </View>
            )}
          </View>
        </View>
        {!group.isMember && (
          <View style={styles.action} onStartShouldSetResponder={() => true}>
            <Button
              label={group.isPendingApproval ? 'Requested' : 'Join'}
              variant={group.isPendingApproval ? 'outline' : 'primary'}
              size="sm"
              disabled={group.isPendingApproval}
              onPress={() => onJoin(group.id)}
            />
          </View>
        )}
      </View>

      {/* Transparent modal so the menu renders above all sibling cards */}
      <Modal visible={menuOpen} transparent animationType="none" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={[styles.kebabMenu, { top: menuPos.top, right: menuPos.right }]}>
            <TouchableOpacity
              style={styles.kebabItem}
              onPress={() => { setMenuOpen(false); Share.share({ message: group.name }); }}
            >
              <Icon name="share-outline" size={15} color={Colors.textPrimary} />
              <Text style={styles.kebabItemText}>Share</Text>
            </TouchableOpacity>
            <View style={styles.kebabDivider} />
            {isAdmin ? (
              <>
                <TouchableOpacity
                  style={styles.kebabItem}
                  onPress={() => { setMenuOpen(false); onEdit(group.id); }}
                >
                  <Icon name="pencil-outline" size={15} color={Colors.textPrimary} />
                  <Text style={styles.kebabItemText}>Edit</Text>
                </TouchableOpacity>
                <View style={styles.kebabDivider} />
                <TouchableOpacity
                  style={styles.kebabItem}
                  onPress={() => {
                    setMenuOpen(false);
                    Alert.alert(
                      'Delete Group',
                      `Are you sure you want to delete "${group.name}"? This cannot be undone.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => onDelete(group.id) },
                      ],
                    );
                  }}
                >
                  <Icon name="trash-outline" size={15} color={Colors.error} />
                  <Text style={[styles.kebabItemText, styles.kebabItemDestructive]}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.kebabItem}
                onPress={() => { setMenuOpen(false); onLeave(group.id); }}
              >
                <Icon name="exit-outline" size={15} color={Colors.error} />
                <Text style={[styles.kebabItemText, styles.kebabItemDestructive]}>Leave</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing[3], marginBottom: Spacing[2], ...Shadows.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  info: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], marginBottom: 3 },
  name: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full, gap: 3 },
  categoryLabel: { fontSize: Typography.xs, fontWeight: Typography.medium },
  memberCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  memberText: { fontSize: Typography.xs, color: Colors.textSecondary },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[1], marginTop: 4 },
  parishPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full, backgroundColor: Colors.primary + '12', maxWidth: 160 },
  parishPillText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: Typography.medium },
  privatePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt },
  privatePillText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  action: { flexShrink: 0 },
  kebabContainer: { position: 'absolute', top: Spacing[3], right: Spacing[4], zIndex: 1 },
  kebabMenu: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 140,
    ...Shadows.md,
  },
  kebabItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], paddingHorizontal: Spacing[3], paddingVertical: Spacing[3] },
  kebabItemText: { fontSize: Typography.sm, color: Colors.textPrimary },
  kebabItemDestructive: { color: Colors.error },
  kebabDivider: { height: 1, backgroundColor: Colors.border },
  badge: { backgroundColor: Colors.error, borderRadius: Radius.full, minWidth: 18, height: 18, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeWide: { paddingHorizontal: 6 },
  badgeText: { fontSize: 11, fontWeight: Typography.bold, color: '#fff', lineHeight: 14 },
});
