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
import { Button } from '../../components/ui/Button';
import { EditPrayerGroupModal } from '../../components/prayer/EditPrayerGroupModal';
import { AddToGroupModal } from '../../components/prayer/AddToGroupModal';
import { usePrayerStore } from '../../store/prayerStore';
import { useAuthStore } from '../../store/authStore';
import { api, mapPrayerGroup } from '../../lib/apiClient';
import { CardList, Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { GroupProfileRouteProp, RootNavigationProp } from '../../types/navigation';

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 110;
const AVATAR_BORDER = 2;
const AVATAR_GAP = 4;
const AVATAR_TOTAL = AVATAR_SIZE + (AVATAR_BORDER + AVATAR_GAP) * 2;

const CATEGORY_LABELS: Record<string, string> = {
  bible_study: 'Bible Study',
  mens_group: "Men's Group",
  womens_group: "Women's Group",
  young_adults: 'Young Adults',
  families: 'Families',
  devotional: 'Devotional',
  general: 'General',
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
  onPress: () => void;
  isLast: boolean;
}

function MemberRow({ member, isGroupAdmin, canRemove, onRemove, onPress, isLast }: MemberRowProps) {
  const meta = [`@${member.username}`, isGroupAdmin && 'Admin'].filter(Boolean).join(' · ');

  const handleLongPress = () => {
    if (!canRemove) return;
    Alert.alert(undefined as any, undefined as any, [
      { text: 'Remove from Group', style: 'destructive', onPress: onRemove },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity
      style={[memberStyles.card, isLast && memberStyles.cardLast]}
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      activeOpacity={0.97}
    >
      <View style={memberStyles.row}>
        <Avatar name={member.displayName} uri={member.avatarUrl} size={42} />
        <View style={memberStyles.info}>
          <Text style={memberStyles.displayName} numberOfLines={1}>{member.displayName}</Text>
          <Text style={memberStyles.meta} numberOfLines={1}>{meta}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const memberStyles = StyleSheet.create({
  card: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d8d3cb',
  },
  cardLast: {
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  info: { flex: 1, minWidth: 0 },
  displayName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  meta: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
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

  const handleRemoveMember = async (member: Member) => {
    try {
      await api.removeMember(groupId, member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setMemberCount((c: number) => Math.max(0, c - 1));
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not remove member.');
    }
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
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const established = new Date(group.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const categoryLabel = CATEGORY_LABELS[group.category] ?? group.category;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      bounces
    >
      <StatusBar barStyle="dark-content" />

      {/* ── Header row ── */}
      <View style={[styles.headerRow, { paddingTop: insets.top + Spacing[3] }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        {isAdmin ? (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setEditModalVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="ellipsis-horizontal" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* ── Avatar with gold ring ── */}
      <View style={styles.avatarCenter}>
        <TouchableOpacity
          onPress={handleAvatarPress}
          disabled={!isAdmin || avatarUploading}
          activeOpacity={isAdmin ? 0.85 : 1}
        >
          <View style={styles.avatarRing}>
            {avatarUploading ? (
              <ActivityIndicator color={Colors.accent} />
            ) : (
              <Avatar uri={group.avatarUrl} name={group.name} size={AVATAR_SIZE} />
            )}
          </View>
          {isAdmin && (
            <View style={styles.cameraBadge}>
              {avatarUploading
                ? <ActivityIndicator size="small" color={Colors.textInverse} />
                : <Icon name="camera-outline" size={14} color={Colors.textPrimary} />
              }
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Name ── */}
      <Text style={styles.groupName}>{group.name}</Text>

      {/* ── Parish ── */}
      {group.parish ? (
        <Text style={styles.categoryText}>{group.parish}</Text>
      ) : null}

      {/* ── Gold divider ── */}
      <View style={styles.goldDivider} />

      {/* ── Description ── */}
      {group.description ? (
        <Text style={styles.descriptionLabel}>{group.description}</Text>
      ) : null}

      {/* ── Action buttons ── */}
      <View style={styles.actionRow}>
        {group.isMember ? (
          <>
            <TouchableOpacity
              style={styles.actionBtnOutlined}
              onPress={handleMuteToggle}
              activeOpacity={0.7}
            >
              <Icon
                name={isMuted ? 'notifications-off-outline' : 'notifications-outline'}
                size={16}
                color={Colors.textPrimary}
              />
              <Text style={styles.actionBtnText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnOutlined}
              onPress={() => Alert.alert('Coming Soon', 'Sharing will be available in a future update.')}
              activeOpacity={0.7}
            >
              <Icon name="share-outline" size={16} color={Colors.textPrimary} />
              <Text style={styles.actionBtnText}>Share</Text>
            </TouchableOpacity>

            {isAdmin ? (
              <TouchableOpacity
                style={[styles.actionBtnOutlined, styles.actionBtnDanger]}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Icon name="trash-outline" size={16} color={Colors.error} />
                <Text style={[styles.actionBtnText, { color: Colors.error }]}>Delete</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtnOutlined, styles.actionBtnDanger]}
                onPress={handleLeave}
                activeOpacity={0.7}
              >
                <Icon name="exit-outline" size={16} color={Colors.error} />
                <Text style={[styles.actionBtnText, { color: Colors.error }]}>Leave</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Button
            label={group.isPendingApproval ? 'Requested' : 'Join Group'}
            variant={group.isPendingApproval ? 'outline' : 'primary'}
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
            disabled={group.isPendingApproval}
            loading={joining}
            showArrow={!group.isPendingApproval}
          />
        )}
      </View>

      {/* ── Stats card ── */}
      <View style={styles.statsCard}>
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>MEMBERS</Text>
          <Text style={styles.statsValueSmall}>{memberCount}</Text>
        </View>

        <View style={styles.statsDivider} />

        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>CATEGORY</Text>
          <Text style={styles.statsValueSmall}>{categoryLabel}</Text>
        </View>

        <View style={styles.statsDivider} />

        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>ESTABLISHED</Text>
          <Text style={styles.statsValueSmall}>{established}</Text>
        </View>
      </View>

      {/* ── About ── */}
      {!!group.meetingSchedule && (
        <>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Icon name="time-outline" size={18} color={Colors.accent} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>{group.meetingSchedule}</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* ── Pending Requests ── */}
      {isAdmin && (pendingLoading || pendingMembers.length > 0) && (
        <>
          <Text style={styles.sectionLabel}>
            REQUESTS{pendingMembers.length > 0 ? ` (${pendingMembers.length})` : ''}
          </Text>
          {pendingLoading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginVertical: Spacing[4] }} />
          ) : (
            pendingMembers.map((member, index) => (
              <View key={member.id} style={[CardList.item, index === 0 && CardList.itemFirst, index === pendingMembers.length - 1 && CardList.itemLast]}>
                <TouchableOpacity
                  style={styles.requestRow}
                  onPress={() => navigation.navigate('UserProfile', { id: member.id })}
                  activeOpacity={0.85}
                >
                  <Avatar name={member.displayName} uri={member.avatarUrl} size={42} />
                  <View style={memberStyles.info}>
                    <Text style={memberStyles.displayName} numberOfLines={1}>{member.displayName}</Text>
                    <Text style={memberStyles.meta}>@{member.username}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <Button
                      label="Accept"
                      size="sm"
                      onPress={() => handleApproveMember(member)}
                    />
                    <Button
                      label="Decline"
                      variant="ghost"
                      size="sm"
                      onPress={() => handleRejectMember(member)}
                      textStyle={{ color: Colors.textSecondary }}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </>
      )}

      {/* ── Members ── */}
      {isAdmin && pendingMembers.length > 0 && <View style={{ height: Spacing[6] }} />}
      <View style={styles.membersSectionHeader}>
        <Text style={styles.sectionLabel}>MEMBERS ({memberCount})</Text>
        {group.isMember && (
          <TouchableOpacity
            style={styles.addMemberBtn}
            onPress={() => setAddMemberModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addMemberBtnText}>+ Add member</Text>
          </TouchableOpacity>
        )}
      </View>
      {membersLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginVertical: Spacing[4] }} />
      ) : members.length === 0 ? (
        <Text style={styles.emptyText}>No members found.</Text>
      ) : (
        <>
          {members.map((member, index) => (
            <View key={member.id} style={[CardList.item, index === 0 && CardList.itemFirst, index === members.length - 1 && CardList.itemLast]}>
              <MemberRow
                member={member}
                isGroupAdmin={member.id === group.admin.id}
                canRemove={isAdmin && member.id !== group.admin.id}
                onRemove={() => handleRemoveMember(member)}
                onPress={() => navigation.navigate('UserProfile', { id: member.id })}
                isLast={index === members.length - 1}
              />
            </View>
          ))}
        </>
      )}

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
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: Spacing[12],
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
  groupName: {
    fontFamily: 'CormorantGaramond-Regular',
    fontSize: Typography['3xl'],
    color: '#000000',
    lineHeight: Typography['3xl'] * 1.15,
    textAlign: 'center',
    marginBottom: Spacing[1],
  },
  categoryText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
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
  descriptionLabel: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.base * 1.5,
    paddingHorizontal: Spacing[8],
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
  actionBtnDanger: {
    borderColor: Colors.error + '40',
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
  detailSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing[4],
  },

  // ── Members ──
  membersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing[6],
    marginBottom: Spacing[3],
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    paddingBottom: 4,
  },
  addMemberBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  addMemberBtnArrow: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing[4],
  },

  // ── Request rows ──
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    gap: Spacing[3],
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
});
