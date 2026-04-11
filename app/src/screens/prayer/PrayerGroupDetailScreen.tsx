import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { usePrayerStore } from '../../store/prayerStore';
import { useGroupChatStore } from '../../store/groupChatStore';
import { useAuthStore } from '../../store/authStore';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import type { GroupMessage } from '../../types';
import { GROUP_REACTION_EMOJIS } from '../../types';
import type { PrayerGroupDetailRouteProp, RootNavigationProp } from '../../types/navigation';
import { api } from '../../lib/apiClient';

// ─── Chat palette (maps to app theme) ─────────────────────────────────────────

const D = {
  bg: Colors.background,
  header: Colors.primaryDark,
  bubble: Colors.surface,
  bubbleBorder: Colors.border,
  input: Colors.surfaceAlt,
  inputBorder: Colors.border,
  chip: Colors.surfaceAlt,
  chipActive: Colors.primary,
  separator: Colors.surfaceAlt,
  text: Colors.textPrimary,
  textMuted: Colors.textSecondary,
  textDim: Colors.textLight,
  accent: Colors.accent,
  overlay: Colors.overlay,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface DateSeparatorItem {
  type: 'separator';
  id: string;
  label: string;
}

type RenderItem = GroupMessage | DateSeparatorItem;

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffHours < 24 * 7) {
    return date.toLocaleDateString([], { weekday: 'short' }) +
      ' ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatSeparatorLabel(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
}

function buildRenderData(messages: GroupMessage[]): RenderItem[] {
  // Messages arrive newest-first; the FlatList is inverted so index 0 renders at the bottom.
  // To show a separator *above* each day's messages, emit it *after* all messages for that day
  // (i.e. when the day changes), so it sits above them in the inverted view.
  const result: RenderItem[] = [];
  let currentDay = '';
  let currentLabel = '';
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toDateString();
    if (day !== currentDay) {
      if (currentDay !== '') {
        result.push({ type: 'separator', id: `sep-${currentDay}`, label: currentLabel });
      }
      currentDay = day;
      currentLabel = formatSeparatorLabel(msg.createdAt);
    }
    result.push(msg);
  }
  if (currentDay !== '') {
    result.push({ type: 'separator', id: `sep-${currentDay}`, label: currentLabel });
  }
  return result;
}

// ─── Date Separator ───────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={sepStyles.container}>
      <Text style={sepStyles.label}>{label}</Text>
    </View>
  );
}

const sepStyles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: Spacing[4], marginBottom: Spacing[1] },
  label: { fontSize: Typography.xs, color: D.textMuted, fontWeight: Typography.medium },
});

// ─── Emoji Picker Modal ───────────────────────────────────────────────────────

interface EmojiPickerProps {
  visible: boolean;
  messageId: string;
  groupId: string;
  onDismiss: () => void;
}

function EmojiPicker({ visible, messageId, groupId, onDismiss }: EmojiPickerProps) {
  const { toggleReaction } = useGroupChatStore();

  const handleEmoji = useCallback(async (emoji: string) => {
    onDismiss();
    await toggleReaction(groupId, messageId, emoji);
  }, [groupId, messageId, toggleReaction, onDismiss]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={pickerStyles.overlay} onPress={onDismiss}>
        <View style={pickerStyles.container}>
          {GROUP_REACTION_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => handleEmoji(emoji)}
              style={pickerStyles.emojiBtn}
              activeOpacity={0.7}
            >
              <Text style={pickerStyles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: D.overlay },
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  emojiBtn: { padding: Spacing[2] },
  emoji: { fontSize: 30 },
});

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: GroupMessage;
  groupId: string;
  isMember: boolean;
  onAddReaction: (messageId: string) => void;
}

function MessageBubble({ message, groupId, isMember, onAddReaction }: MessageBubbleProps) {
  const { toggleReaction } = useGroupChatStore();

  return (
    <View style={bubbleStyles.row}>
      {/* Avatar column */}
      <View style={bubbleStyles.avatarCol}>
        <Avatar
          name={message.author.displayName}
          uri={message.author.avatarUrl}
          size={36}
        />
      </View>

      {/* Content column */}
      <View style={bubbleStyles.contentCol}>
        {/* Name + time */}
        <View style={bubbleStyles.metaRow}>
          <Text style={bubbleStyles.senderName}>{message.author.displayName}</Text>
          <Text style={bubbleStyles.time}>{formatMessageTime(message.createdAt)}</Text>
        </View>

        {/* Bubble */}
        <View style={bubbleStyles.bubble}>
          {message.imageUrl && (
            <View>
              <Image
                source={{ uri: message.imageUrl }}
                style={bubbleStyles.image}
                resizeMode="cover"
              />
              {message.pending && (
                <View style={bubbleStyles.pendingOverlay}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              )}
            </View>
          )}
          {message.content ? <Text style={[bubbleStyles.text, message.imageUrl ? bubbleStyles.caption : null]}>{message.content}</Text> : null}
        </View>

        {/* Reactions */}
        {!message.pending && (message.reactions.length > 0 || isMember) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={bubbleStyles.reactionsScroll}
            contentContainerStyle={bubbleStyles.reactionsContent}
          >
            {message.reactions.map((r) => (
              <TouchableOpacity
                key={r.emoji}
                onPress={() => isMember && toggleReaction(groupId, message.id, r.emoji)}
                style={[chipStyles.chip, r.userReacted && chipStyles.chipActive]}
                activeOpacity={0.7}
              >
                <Text style={chipStyles.emoji}>{r.emoji}</Text>
                <Text style={[chipStyles.count, r.userReacted && chipStyles.countActive]}>
                  {r.count}
                </Text>
              </TouchableOpacity>
            ))}
            {isMember && (
              <TouchableOpacity
                onPress={() => onAddReaction(message.id)}
                style={chipStyles.addBtn}
                activeOpacity={0.7}
              >
                <Text style={chipStyles.addBtnEmoji}>🙂</Text>
                <Icon name="add" size={12} color={D.textMuted} />
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[3],
    paddingVertical: 5,
    alignItems: 'flex-start',
  },
  avatarCol: { marginRight: 10, marginTop: 2 },
  contentCol: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 },
  senderName: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: D.text },
  time: { fontSize: Typography.xs, color: D.textMuted },
  bubble: {
    backgroundColor: D.bubble,
    borderRadius: Radius.lg,
    borderTopLeftRadius: 4,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    alignSelf: 'flex-start',
    maxWidth: '92%',
    overflow: 'hidden',
  },
  text: { fontSize: Typography.base, color: D.text, lineHeight: Typography.base * 1.45 },
  image: { width: 220, height: 220, borderRadius: Radius.md, marginBottom: 2 },
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { marginTop: 4 },
  reactionsScroll: { marginTop: 5 },
  reactionsContent: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: 'rgba(26,43,74,0.08)',
    borderColor: Colors.primary,
  },
  emoji: { fontSize: 13 },
  count: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  countActive: { color: Colors.primary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBtnEmoji: { fontSize: 13 },
});

// ─── Members Modal ────────────────────────────────────────────────────────────

interface Member {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: string;
}

interface MembersModalProps {
  visible: boolean;
  groupId: string;
  groupName: string;
  memberCount: number;
  adminId: string;
  onDismiss: () => void;
}

function MembersModal({ visible, groupId, groupName, memberCount, adminId, onDismiss }: MembersModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    api.getGroupMembers(groupId)
      .then((data) => {
        setMembers(
          data.members.map((m) => ({
            id: m.id,
            username: m.username,
            displayName: m.display_name,
            avatarUrl: m.avatar_url,
            joinedAt: m.joined_at,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, groupId]);

  const renderMember = useCallback(({ item }: { item: Member }) => {
    const isAdmin = item.id === adminId;
    return (
      <View style={memberStyles.row}>
        <Avatar name={item.displayName} uri={item.avatarUrl} size={42} />
        <View style={memberStyles.info}>
          <View style={memberStyles.nameRow}>
            <Text style={memberStyles.displayName}>{item.displayName}</Text>
            {isAdmin && (
              <View style={memberStyles.adminBadge}>
                <Text style={memberStyles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={memberStyles.username}>@{item.username}</Text>
        </View>
      </View>
    );
  }, [adminId]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <View style={[memberStyles.sheet, { paddingTop: insets.top > 0 ? insets.top : Spacing[4] }]}>
        {/* Header */}
        <View style={memberStyles.header}>
          <View style={memberStyles.headerLeft} />
          <View style={memberStyles.headerCenter}>
            <Text style={memberStyles.title}>{groupName}</Text>
            <Text style={memberStyles.subtitle}>{memberCount} {memberCount === 1 ? 'member' : 'members'}</Text>
          </View>
          <TouchableOpacity onPress={onDismiss} style={memberStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={memberStyles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={renderMember}
            contentContainerStyle={memberStyles.list}
            ItemSeparatorComponent={() => <View style={memberStyles.separator} />}
            ListEmptyComponent={
              <View style={memberStyles.centered}>
                <Text style={memberStyles.emptyText}>No members found.</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const memberStyles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: { width: 36 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingVertical: Spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  displayName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  adminBadge: {
    backgroundColor: Colors.primaryLight ?? 'rgba(26,43,74,0.1)',
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
    marginLeft: Spacing[4] + 42 + Spacing[3],
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[16],
  },
  emptyText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
});

// ─── Input Bar ────────────────────────────────────────────────────────────────

interface MessageInputBarProps {
  groupId: string;
  groupName: string;
  bottomInset: number;
}

interface DraftPhoto {
  uri: string;
  type: string;
}

function MessageInputBar({ groupId, groupName, bottomInset }: MessageInputBarProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [draftPhoto, setDraftPhoto] = useState<DraftPhoto | null>(null);
  const { sendMessage, sendImageMessage } = useGroupChatStore();

  const hasText = text.trim().length > 0;
  const canSend = (hasText || draftPhoto !== null) && !sending;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const trimmed = text.trim();
    setSending(true);
    setText('');
    const photo = draftPhoto;
    setDraftPhoto(null);
    try {
      if (photo) {
        await sendImageMessage(groupId, photo.uri, photo.type, trimmed || undefined);
      } else {
        await sendMessage(groupId, trimmed);
      }
    } catch {
      // restore draft on failure
      setText(trimmed);
      if (photo) setDraftPhoto(photo);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [canSend, text, draftPhoto, groupId, sendMessage, sendImageMessage]);

  const handlePickPhoto = useCallback(async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, maxWidth: 1200, maxHeight: 1200 });
    if (result.didCancel || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    setDraftPhoto({ uri: asset.uri!, type: asset.type ?? 'image/jpeg' });
  }, []);

  const placeholder = draftPhoto ? 'Add a caption…' : `Message ${groupName.length > 20 ? groupName.slice(0, 20) + '…' : groupName}`;

  return (
    <View style={[inputStyles.wrapper, { paddingBottom: bottomInset > 0 ? bottomInset : Spacing[3] }]}>
      {/* + button */}
      <TouchableOpacity style={inputStyles.plusBtn} activeOpacity={0.7} onPress={handlePickPhoto} disabled={sending}>
        <Icon name="add" size={22} color={Colors.textPrimary} />
      </TouchableOpacity>

      {/* Pill */}
      <View style={inputStyles.pillRow}>
        {/* Photo preview row */}
        {draftPhoto && (
          <View style={inputStyles.photoPreviewRow}>
            <Image source={{ uri: draftPhoto.uri }} style={inputStyles.photoThumb} resizeMode="cover" />
            <TouchableOpacity
              style={inputStyles.photoRemoveBtn}
              onPress={() => setDraftPhoto(null)}
              activeOpacity={0.8}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Icon name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Text + send row */}
        <View style={inputStyles.textRow}>
          <TextInput
            style={inputStyles.input}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={D.textMuted}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          {canSend && (
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending}
              style={inputStyles.sendBtn}
              activeOpacity={0.8}
            >
              {sending
                ? <ActivityIndicator size="small" color="#ffffff" />
                : <Icon name="send" size={13} color="#ffffff" />
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing[3],
    paddingTop: Spacing[2],
    backgroundColor: Colors.surface,
    gap: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  pillRow: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: D.input,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: D.inputBorder,
    overflow: 'hidden',
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing[3],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[2],
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
  },
  photoRemoveBtn: {
    marginLeft: 6,
    marginTop: 2,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingLeft: Spacing[4],
    paddingRight: Spacing[2],
  },
  input: {
    flex: 1,
    fontSize: Typography.base,
    color: D.text,
    maxHeight: 120,
    textAlignVertical: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function PrayerGroupDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<PrayerGroupDetailRouteProp>();
  const groupId = route.params.id;

  const { groups, joinGroup, leaveGroup } = usePrayerStore();
  const { user } = useAuthStore();
  const { messagesByGroup, loadingByGroup, hasMoreByGroup, fetchMessages, loadMoreMessages, clearGroup, markGroupAsRead } =
    useGroupChatStore();

  const group = groups.find((g) => g.id === groupId);
  const messages = messagesByGroup[groupId] ?? [];
  const isLoading = loadingByGroup[groupId] ?? false;
  const hasMore = hasMoreByGroup[groupId] ?? false;

  const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);
  const [membersVisible, setMembersVisible] = useState(false);

  useEffect(() => {
    if (group?.isMember) {
      fetchMessages(groupId).then(() => markGroupAsRead(groupId));
    }
    return () => clearGroup(groupId);
  }, [groupId, group?.isMember]);

  const renderData = useMemo(() => buildRenderData(messages), [messages]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) loadMoreMessages(groupId);
  }, [hasMore, isLoading, groupId, loadMoreMessages]);

  const renderItem = useCallback(
    ({ item }: { item: RenderItem }) => {
      if ('type' in item && item.type === 'separator') {
        return <DateSeparator label={item.label} />;
      }
      return (
        <MessageBubble
          message={item as GroupMessage}
          groupId={groupId}
          isMember={group?.isMember ?? false}
          onAddReaction={setPickerMessageId}
        />
      );
    },
    [groupId, group?.isMember],
  );

  if (!group) {
    return (
      <View style={[styles.centered, { backgroundColor: D.bg, paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>Group not found.</Text>
        <Button label="Go Back" onPress={() => navigation.goBack()} variant="outline" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing[2] }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Icon name="chevron-back" size={26} color={Colors.primary} />
        </TouchableOpacity>

        <Avatar name={group.name} size={34} uri={group.avatarUrl} style={styles.headerAvatar} />

        <TouchableOpacity style={styles.headerTitleRow} activeOpacity={0.7}>
          <Text style={styles.headerName} numberOfLines={1}>{group.name}</Text>
          <Icon name="chevron-forward" size={14} color={Colors.textSecondary} style={{ marginTop: 1 }} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7} onPress={() => setMembersVisible(true)}>
            <Icon name="people-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Message list ── */}
      {group.isMember ? (
        <FlatList
          data={renderData}
          keyExtractor={(item) =>
            'type' in item && item.type === 'separator' ? item.id : (item as GroupMessage).id
          }
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isLoading && hasMore ? <View style={{ height: 20 }} /> : null}
          ListEmptyComponent={
            isLoading ? null : (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🙏</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySub}>Be the first to share a prayer or reflection.</Text>
              </View>
            )
          }
        />
      ) : (
        <View style={styles.nonMemberContent}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>
            {group.isPendingApproval ? 'Membership pending' : 'Members only'}
          </Text>
          <Text style={styles.emptySub}>
            {group.isPendingApproval
              ? 'Your request to join is pending approval.'
              : 'Join this group to participate in the conversation.'}
          </Text>
          {!group.isPendingApproval && (
            <Button
              label="Join Group"
              variant="primary"
              size="sm"
              onPress={() => joinGroup(group.id)}
              style={styles.joinBtn}
            />
          )}
        </View>
      )}

      {/* ── Input bar ── */}
      {group.isMember && (
        <MessageInputBar
          groupId={groupId}
          groupName={group.name}
          bottomInset={insets.bottom}
        />
      )}

      {/* ── Emoji picker ── */}
      {pickerMessageId && (
        <EmojiPicker
          visible={!!pickerMessageId}
          messageId={pickerMessageId}
          groupId={groupId}
          onDismiss={() => setPickerMessageId(null)}
        />
      )}

      {/* ── Members modal ── */}
      <MembersModal
        visible={membersVisible}
        groupId={groupId}
        groupName={group.name}
        memberCount={group.memberCount}
        adminId={group.admin.id}
        onDismiss={() => setMembersVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: Typography.base, color: D.textMuted },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingBottom: Spacing[3],
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing[2],
  },
  backBtn: { paddingRight: 2 },
  headerAvatar: {},
  headerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  headerName: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  headerActions: { flexDirection: 'row', gap: Spacing[1] },
  headerIconBtn: { padding: 6 },

  // List
  listContent: { paddingTop: Spacing[2], paddingBottom: Spacing[2] },

  // Empty / non-member
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing[16],
    paddingHorizontal: Spacing[8],
  },
  nonMemberContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    gap: Spacing[2],
  },
  emptyIcon: { fontSize: 40, marginBottom: Spacing[2] },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: D.text,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: Typography.base,
    color: D.textMuted,
    textAlign: 'center',
    lineHeight: Typography.base * 1.5,
  },
  joinBtn: { marginTop: Spacing[3] },
});
