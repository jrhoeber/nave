import React, { useEffect, useState } from 'react';
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
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { EditPrayerGroupModal } from '../../components/prayer/EditPrayerGroupModal';
import { AddToGroupModal } from '../../components/prayer/AddToGroupModal';
import { usePrayerStore } from '../../store/prayerStore';
import { useAuthStore } from '../../store/authStore';
import { api, mapPrayerGroup } from '../../lib/apiClient';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { GroupProfileRouteProp, RootNavigationProp } from '../../types/navigation';

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 96;
const AVATAR_BORDER = 4;
const AVATAR_TOTAL = AVATAR_SIZE + AVATAR_BORDER * 2;

const CATEGORY_LABELS: Record<string, string> = {
  rosary: '📿 Rosary',
  scripture_study: '📖 Scripture Study',
  mens_group: "🛡️ Men's Group",
  womens_group: '🌸 Women\'s Group',
  youth: '😊 Youth',
  young_adults: '🙌 Young Adults',
  families: '🏠 Families',
  devotional: '❤️ Devotional',
  general: '💬 General',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: string;
}

// ─── Member Row ───────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: Member;
  isGroupAdmin: boolean;
  canRemove: boolean;
  onRemove: () => void;
  separator: boolean;
}

function MemberRow({ member, isGroupAdmin, canRemove, onRemove, separator }: MemberRowProps) {
  return (
    <>
      <View style={memberStyles.row}>
        <Avatar name={member.displayName} uri={member.avatarUrl} size={44} />
        <View style={memberStyles.info}>
          <View style={memberStyles.nameRow}>
            <Text style={memberStyles.displayName} numberOfLines={1}>{member.displayName}</Text>
            {isGroupAdmin && (
              <View style={memberStyles.adminBadge}>
                <Text style={memberStyles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={memberStyles.username}>@{member.username}</Text>
        </View>
        {canRemove && (
          <TouchableOpacity
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
          >
            <Icon name="close-circle-outline" size={22} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
      {separator && <View style={memberStyles.separator} />}
    </>
  );
}

const memberStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], flexShrink: 1 },
  displayName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  adminBadge: {
    backgroundColor: Colors.primaryLight + '22',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  adminBadgeText: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  username: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing[4] + 44 + Spacing[3],
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function GroupProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<GroupProfileRouteProp>();
  const groupId = route.params.id;

  const { groups, joinGroup, leaveGroup, deleteGroup, muteGroup, unmuteGroup, mutedGroupIds, uploadGroupAvatar, removeGroupAvatar } =
    usePrayerStore();
  const user = useAuthStore((s) => s.user);

  const storeGroup = groups.find((g) => g.id === groupId);
  const [fetchedGroup, setFetchedGroup] = useState<typeof storeGroup | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const group = storeGroup ?? fetchedGroup ?? undefined;
  const isAdmin = !!user && !!group && user.id === group.admin.id;
  const isMuted = mutedGroupIds.has(groupId);

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberCount, setMemberCount] = useState(group?.memberCount ?? 0);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!storeGroup) {
      api.getGroup(groupId)
        .then((data) => setFetchedGroup(mapPrayerGroup(data)))
        .catch(() => setFetchError(true));
    }
  }, [groupId, storeGroup]);

  useEffect(() => {
    if (group) setMemberCount(group.memberCount);
  }, [group?.memberCount]);

  useEffect(() => {
    setMembersLoading(true);
    api
      .getGroupMembers(groupId)
      .then((data) => {
        const mapped = data.members.map((m) => ({
          id: m.id,
          username: m.username,
          displayName: m.display_name,
          avatarUrl: m.avatar_url?.startsWith('http') ? m.avatar_url : undefined,
          joinedAt: m.joined_at,
        }));
        setMembers(mapped);
        setMemberCount(mapped.length);
      })
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, [groupId]);

  useEffect(() => {
    if (!isAdmin) return;
    setPendingLoading(true);
    api
      .getPendingMembers(groupId)
      .then((data) => {
        setPendingMembers(data.members.map((m) => ({
          id: m.id,
          username: m.username,
          displayName: m.display_name,
          avatarUrl: m.avatar_url?.startsWith('http') ? m.avatar_url : undefined,
          joinedAt: m.requested_at,
        })));
      })
      .catch(() => {})
      .finally(() => setPendingLoading(false));
  }, [groupId, isAdmin]);

  const handleMuteToggle = async () => {
    if (isMuted) {
      await unmuteGroup(groupId);
    } else {
      await muteGroup(groupId);
    }
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${group?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(groupId);
              navigation.navigate('App');
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not leave group.');
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Group',
      `Permanently delete "${group?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(groupId);
              navigation.navigate('App');
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not delete group.');
            }
          },
        },
      ],
    );
  };

  const handleAvatarPress = () => {
    if (!isAdmin) return;
    Alert.alert(
      'Group Photo',
      undefined,
      [
        { text: 'Upload New Photo', onPress: handlePickAvatar },
        ...(group?.avatarUrl
          ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: handleRemoveAvatar }]
          : []),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handlePickAvatar = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', maxWidth: 512, maxHeight: 512, quality: 0.8 });
    const asset = result.assets?.[0];
    if (!asset?.uri || !asset?.type) return;
    setAvatarUploading(true);
    try {
      await uploadGroupAvatar(groupId, asset.uri, asset.type);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to upload photo.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    try {
      await removeGroupAvatar(groupId);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to remove photo.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveMember = (member: Member) => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.displayName} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.removeMember(groupId, member.id);
              setMembers((prev) => prev.filter((m) => m.id !== member.id));
              setMemberCount((c: number) => Math.max(0, c - 1));
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not remove member.');
            }
          },
        },
      ],
    );
  };

  const handleApproveMember = async (member: Member) => {
    try {
      await api.approveMember(groupId, member.id);
      setPendingMembers((prev) => prev.filter((m) => m.id !== member.id));
      setMembers((prev) => [...prev, member]);
      setMemberCount((c) => c + 1);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not approve request.');
    }
  };

  const handleRejectMember = (member: Member) => {
    Alert.alert(
      'Decline Request',
      `Decline ${member.displayName}'s request to join?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.removeMember(groupId, member.id);
              setPendingMembers((prev) => prev.filter((m) => m.id !== member.id));
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not decline request.');
            }
          },
        },
      ],
    );
  };

  if (!group) {
    if (fetchError) {
      return (
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.notFoundText}>Group not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: Spacing[3] }}>
            <Text style={{ color: Colors.primary, fontSize: Typography.base }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const established = new Date(group.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: Spacing[12] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={[styles.hero, { paddingTop: insets.top + Spacing[3] }]}>
          <View style={styles.heroRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.heroBtn}
            >
              <Icon name="chevron-back" size={24} color={Colors.accentLight} />
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => setEditModalVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.heroBtn}
              >
                <Icon name="settings-outline" size={22} color={Colors.accentLight} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.heroRule} />
        </View>

        {/* ── Avatar ── */}
        <View style={styles.avatarAnchor}>
          <TouchableOpacity
            onPress={handleAvatarPress}
            disabled={!isAdmin || avatarUploading}
            activeOpacity={isAdmin ? 0.75 : 1}
          >
            <View style={styles.avatarRing}>
              {avatarUploading ? (
                <View style={styles.avatarLoader}>
                  <ActivityIndicator color={Colors.accent} />
                </View>
              ) : (
                <Avatar uri={group.avatarUrl} name={group.name} size={AVATAR_SIZE} />
              )}
            </View>
            {isAdmin && (
              <View style={styles.cameraBadge}>
                <Icon name="camera" size={13} color={Colors.surface} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Identity ── */}
        <View style={styles.identity}>
          <Text style={styles.groupName}>{group.name}</Text>

          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>
              {CATEGORY_LABELS[group.category] ?? group.category}
            </Text>
          </View>

          {group.parish ? (
            <View style={styles.parishPill}>
              <Icon name="business-outline" size={12} color={Colors.accent} />
              <Text style={styles.parishText} numberOfLines={1}>{group.parish}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Ornament ── */}
        <View style={styles.ornament}>
          <View style={styles.ornamentLine} />
          <View style={styles.ornamentDot} />
          <View style={styles.ornamentDot} />
          <View style={styles.ornamentDot} />
          <View style={styles.ornamentLine} />
        </View>

        {/* ── Info ── */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Icon name="calendar-outline" size={14} color={Colors.textSecondary} style={styles.infoIcon} />
            <Text style={styles.infoMeta}>Established </Text>
            <Text style={styles.infoValue}>{established}</Text>
          </View>
          {group.meetingSchedule ? (
            <View style={styles.infoRow}>
              <Icon name="time-outline" size={14} color={Colors.textSecondary} style={styles.infoIcon} />
              <Text style={styles.infoValue} numberOfLines={3}>{group.meetingSchedule}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Description ── */}
        {group.description ? (
          <Text style={styles.description}>{group.description}</Text>
        ) : null}

        {/* ── Actions ── */}
        {group.isMember ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleMuteToggle} activeOpacity={0.7}>
              <Icon
                name={isMuted ? 'notifications-off-outline' : 'notifications-outline'}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.actionBtnLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Alert.alert('Coming Soon', 'Sharing will be available in a future update.')}
              activeOpacity={0.7}
            >
              <Icon name="share-outline" size={20} color={Colors.primary} />
              <Text style={styles.actionBtnLabel}>Share</Text>
            </TouchableOpacity>

            {isAdmin ? (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleDelete} activeOpacity={0.7}>
                <Icon name="trash-outline" size={20} color={Colors.error} />
                <Text style={[styles.actionBtnLabel, styles.actionBtnLabelDanger]}>Delete</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleLeave} activeOpacity={0.7}>
                <Icon name="exit-outline" size={20} color={Colors.error} />
                <Text style={[styles.actionBtnLabel, styles.actionBtnLabelDanger]}>Leave</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnJoin, group.isPendingApproval && styles.actionBtnPending]}
              onPress={async () => {
                if (group.isPendingApproval || joining) return;
                setJoining(true);
                try {
                  await joinGroup(group.id, group);
                } catch (e: any) {
                  Alert.alert('Error', e.message ?? 'Could not join group.');
                } finally {
                  setJoining(false);
                }
              }}
              disabled={group.isPendingApproval || joining}
              activeOpacity={0.7}
            >
              {joining ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <Icon name={group.isPendingApproval ? 'time-outline' : 'person-add-outline'} size={20} color={group.isPendingApproval ? Colors.textSecondary : Colors.textInverse} />
              )}
              <Text style={[styles.actionBtnLabel, !group.isPendingApproval && styles.actionBtnLabelJoin]}>
                {group.isPendingApproval ? 'Requested' : 'Join Group'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Pending Requests ── */}
        {isAdmin && (pendingLoading || pendingMembers.length > 0) && (
          <View style={styles.membersSection}>
            <View style={styles.membersSectionHeader}>
              <Text style={styles.membersSectionTitle}>
                Requests{pendingMembers.length > 0 ? ` (${pendingMembers.length})` : ''}
              </Text>
            </View>
            {pendingLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing[4] }} />
            ) : pendingMembers.length === 0 ? (
              <Text style={styles.emptyText}>No pending requests.</Text>
            ) : (
              pendingMembers.map((member, index) => (
                <View key={member.id}>
                  <View style={memberStyles.row}>
                    <Avatar name={member.displayName} uri={member.avatarUrl} size={44} />
                    <View style={memberStyles.info}>
                      <Text style={memberStyles.displayName} numberOfLines={1}>{member.displayName}</Text>
                      <Text style={memberStyles.username}>@{member.username}</Text>
                    </View>
                    <View style={styles.pendingActions}>
                      <TouchableOpacity
                        style={styles.pendingApproveBtn}
                        onPress={() => handleApproveMember(member)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name="checkmark" size={16} color={Colors.textInverse} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRejectMember(member)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name="close" size={20} color={Colors.textLight} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {index < pendingMembers.length - 1 && <View style={memberStyles.separator} />}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Members ── */}
        <View style={styles.membersSection}>
          <View style={styles.membersSectionHeader}>
            <Text style={styles.membersSectionTitle}>
              Members ({memberCount})
            </Text>
            <TouchableOpacity
              onPress={() => setAddMemberModalVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.addMemberBtn}
            >
              <Icon name="person-add-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {membersLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing[4] }} />
          ) : members.length === 0 ? (
            <Text style={styles.emptyText}>No members found.</Text>
          ) : (
            members.map((member, index) => (
              <MemberRow
                key={member.id}
                member={member}
                isGroupAdmin={member.id === group.admin.id}
                canRemove={isAdmin && member.id !== group.admin.id}
                onRemove={() => handleRemoveMember(member)}
                separator={index < members.length - 1}
              />
            ))
          )}
        </View>
      </ScrollView>

      {isAdmin && (
        <EditPrayerGroupModal
          group={group}
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
        />
      )}

      <AddToGroupModal
        visible={addMemberModalVisible}
        onClose={() => setAddMemberModalVisible(false)}
        groupId={groupId}
        existingMembers={members}
        onMemberAdded={(newMember) => {
          setMembers((prev) => [...prev, { ...newMember, joinedAt: new Date().toISOString() }]);
          setMemberCount((c) => c + 1);
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
  },
  notFoundText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },

  // Hero
  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing[5],
    paddingBottom: AVATAR_TOTAL / 2 + Spacing[6],
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  heroBtn: {},
  heroRule: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.accent,
    opacity: 0.5,
  },

  // Avatar
  avatarAnchor: {
    alignItems: 'center',
    marginTop: -(AVATAR_TOTAL / 2),
    zIndex: 10,
    marginBottom: Spacing[3],
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
  avatarLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

  // Identity
  identity: {
    alignItems: 'center',
    paddingHorizontal: Spacing[6],
    gap: Spacing[2],
  },
  groupName: {
    fontFamily: Typography.fontSerif,
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  categoryChip: {
    backgroundColor: Colors.accent + '18',
    borderWidth: 1,
    borderColor: Colors.accent + '40',
    borderRadius: Radius.full,
    paddingVertical: 5,
    paddingHorizontal: Spacing[3],
  },
  categoryChipText: {
    fontSize: Typography.sm,
    color: Colors.accentDark,
    fontWeight: Typography.semibold,
    letterSpacing: 0.2,
  },
  parishPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingVertical: 5,
    paddingHorizontal: Spacing[3],
  },
  parishText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    letterSpacing: 0.2,
    maxWidth: 240,
  },

  // Ornament
  ornament: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginVertical: Spacing[5],
    marginHorizontal: Spacing[10],
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

  // Info
  infoSection: {
    paddingHorizontal: Spacing[6],
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
  },
  infoIcon: {
    marginTop: 1,
  },
  infoMeta: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.medium,
    flex: 1,
  },

  // Description
  description: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.base * Typography.relaxed,
    paddingHorizontal: Spacing[6],
    marginBottom: Spacing[6],
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[6],
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing[1],
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  actionBtnLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  actionBtnDanger: {
    borderColor: Colors.error + '30',
    backgroundColor: Colors.error + '08',
  },
  actionBtnLabelDanger: {
    color: Colors.error,
  },
  actionBtnJoin: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    flex: 0,
    paddingHorizontal: Spacing[6],
  },
  actionBtnPending: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  actionBtnLabelJoin: {
    color: Colors.textInverse,
  },

  // Members
  membersSection: {
    marginTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },
  membersSectionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addMemberBtn: {
    padding: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  pendingApproveBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing[4],
  },
});
