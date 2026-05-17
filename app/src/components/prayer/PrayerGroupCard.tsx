import React, { useRef, useState } from 'react';
import { Alert, Dimensions, Modal, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Avatar } from '../../components/ui/Avatar';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { PrayerGroup, PrayerGroupCategory } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Text } from '../ui/Text';

interface PrayerGroupCardProps {
  group: PrayerGroup;
  onPress: (id: string) => void;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMute?: (id: string) => void;
  onUnmute?: (id: string) => void;
  isMuted?: boolean;
  unreadCount?: number;
  lastMessageAt?: string;
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const date = new Date(iso);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  if (date.getFullYear() === new Date().getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const CATEGORY_CONFIG: Record<PrayerGroupCategory, { label: string; icon: string; color: string }> = {
  bible_study:{ label: 'Bible Study',     icon: 'book-outline',       color: Colors.success },
  mens_group:     { label: "Men's Group",     icon: 'shield-outline',     color: Colors.primary },
  womens_group:   { label: "Women's Group",   icon: 'flower-outline',     color: '#ec4899' },
  young_adults:   { label: 'Young Adults',    icon: 'people-outline',     color: Colors.info },
  families:       { label: 'Families',        icon: 'home-outline',       color: Colors.accentDark },
  devotional:     { label: 'Devotional',      icon: 'heart-outline',      color: '#e11d48' },
  general:        { label: 'General',         icon: 'chatbubbles-outline', color: Colors.textSecondary },
};

function UnreadDot() {
  return <View style={styles.unreadDot} />;
}

function PrayerGroupCardImpl({ group, onPress, onJoin, onLeave, onEdit, onDelete, onMute, onUnmute, isMuted = false, unreadCount = 0, lastMessageAt, isLast }: PrayerGroupCardProps & { isLast?: boolean }) {
  const cat = CATEGORY_CONFIG[group.category];
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isAdmin = group.admin.id === currentUserId;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const cardRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);

  const handleLongPress = () => {
    if (!group.isMember) return;
    cardRef.current?.measure((_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
      const windowWidth = Dimensions.get('window').width;
      setMenuPos({ top: pageY + height + 4, right: windowWidth - pageX - width });
      setMenuOpen(true);
    });
  };

  return (
    <TouchableOpacity ref={cardRef} onPress={() => onPress(group.id)} onLongPress={handleLongPress} delayLongPress={350} activeOpacity={0.97} style={[styles.card, isLast && styles.cardLast]} testID={`group-card-${group.id}`}>

      <View style={styles.row}>
        <Avatar name={group.name} size={42} uri={group.avatarUrl} />
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
            {lastMessageAt && (
              <Text style={styles.titleTime} numberOfLines={1}>• {formatRelativeTime(lastMessageAt)}</Text>
            )}
            {isMuted && <Icon name="notifications-off-outline" size={13} color={Colors.textSecondary} />}
          </View>
          <Text style={styles.metaLine} numberOfLines={1}>
            {cat.label} · {group.memberCount === 1 ? '1 Member' : `${group.memberCount.toLocaleString()} Members`}
          </Text>
        </View>
        {group.isMember ? (
          <View style={styles.rightMeta}>
            {unreadCount > 0 && <UnreadDot />}
          </View>
        ) : (
          <View style={styles.action} onStartShouldSetResponder={() => true}>
            {group.isPendingApproval ? (
              <Text style={styles.requestedText}>Requested</Text>
            ) : (
              <TouchableOpacity style={styles.joinBtn} onPress={() => onJoin(group.id)} activeOpacity={0.7}>
                <Text style={styles.joinBtnText}>Join</Text>
              </TouchableOpacity>
            )}
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
            <TouchableOpacity
              style={styles.kebabItem}
              onPress={() => {
                setMenuOpen(false);
                if (isMuted) {
                  onUnmute?.(group.id);
                } else {
                  onMute?.(group.id);
                }
              }}
            >
              <Icon name={isMuted ? 'notifications-outline' : 'notifications-off-outline'} size={15} color={Colors.textPrimary} />
              <Text style={styles.kebabItemText}>{isMuted ? 'Unmute notifications' : 'Mute notifications'}</Text>
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

export const PrayerGroupCard = React.memo(PrayerGroupCardImpl, (prev, next) => {
  const a = prev.group;
  const b = next.group;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.memberCount === b.memberCount &&
    a.category === b.category &&
    a.avatarUrl === b.avatarUrl &&
    a.isMember === b.isMember &&
    a.isPendingApproval === b.isPendingApproval &&
    a.admin?.id === b.admin?.id &&
    prev.isMuted === next.isMuted &&
    prev.unreadCount === next.unreadCount &&
    prev.lastMessageAt === next.lastMessageAt &&
    prev.isLast === next.isLast &&
    prev.onPress === next.onPress &&
    prev.onJoin === next.onJoin &&
    prev.onLeave === next.onLeave &&
    prev.onEdit === next.onEdit &&
    prev.onDelete === next.onDelete &&
    prev.onMute === next.onMute &&
    prev.onUnmute === next.onUnmute
  );
});

const styles = StyleSheet.create({
  card: { paddingHorizontal: Spacing[5], paddingVertical: Spacing[4], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.cardBorder },
  cardLast: { borderBottomWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  info: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], marginBottom: 3 },
  name: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary, flexShrink: 1 },
  metaLine: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  action: { flexShrink: 0 },
  joinBtn: { borderBottomWidth: 2, borderBottomColor: Colors.accent, paddingBottom: 2 },
  joinBtnText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  requestedText: { fontSize: Typography.sm, color: Colors.textSecondary },
  rightMeta: { flexShrink: 0, alignItems: 'flex-end', gap: Spacing[1] },
  titleTime: { fontSize: Typography.xs, color: Colors.textSecondary, flexShrink: 0 },
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
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
});
