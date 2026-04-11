import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
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
  const result: RenderItem[] = [];
  let lastDay = '';
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toDateString();
    if (day !== lastDay) {
      result.push({ type: 'separator', id: `sep-${msg.id}`, label: formatSeparatorLabel(msg.createdAt) });
      lastDay = day;
    }
    result.push(msg);
  }
  return result;
}

// ─── Date Separator ───────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={sepStyles.container}>
      <View style={sepStyles.pill}>
        <Text style={sepStyles.label}>{label}</Text>
      </View>
    </View>
  );
}

const sepStyles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: Spacing[3] },
  pill: {
    backgroundColor: D.separator,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[4],
    paddingVertical: 5,
  },
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
          <Text style={bubbleStyles.text}>{message.content}</Text>
        </View>

        {/* Reactions */}
        {(message.reactions.length > 0 || isMember) && (
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
  },
  text: { fontSize: Typography.base, color: D.text, lineHeight: Typography.base * 1.45 },
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

// ─── Input Bar ────────────────────────────────────────────────────────────────

interface MessageInputBarProps {
  groupId: string;
  groupName: string;
  bottomInset: number;
}

function MessageInputBar({ groupId, groupName, bottomInset }: MessageInputBarProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { sendMessage } = useGroupChatStore();
  const hasText = text.trim().length > 0;

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      await sendMessage(groupId, trimmed);
    } catch {
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }, [text, sending, groupId, sendMessage]);

  // Truncate placeholder to fit
  const placeholder = `Message ${groupName.length > 20 ? groupName.slice(0, 20) + '…' : groupName}`;

  return (
    <View style={[inputStyles.wrapper, { paddingBottom: bottomInset > 0 ? bottomInset : Spacing[3] }]}>
      {/* + button */}
      <TouchableOpacity style={inputStyles.plusBtn} activeOpacity={0.7}>
        <Icon name="add" size={22} color={Colors.textPrimary} />
      </TouchableOpacity>

      {/* Pill input row */}
      <View style={inputStyles.pillRow}>
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
        {hasText ? (
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending}
            style={inputStyles.sendBtn}
            activeOpacity={0.8}
          >
            <Icon name="send" size={17} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <View style={inputStyles.rightIcons}>
            <TouchableOpacity activeOpacity={0.7} style={inputStyles.iconBtn}>
              <Icon name="at" size={19} color={D.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={inputStyles.iconBtn}>
              <Icon name="happy-outline" size={19} color={D.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={inputStyles.iconBtn}>
              <Icon name="mic-outline" size={19} color={D.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={inputStyles.iconBtn}>
              <Icon name="camera-outline" size={20} color={D.textMuted} />
            </TouchableOpacity>
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: D.input,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: D.inputBorder,
    minHeight: 40,
    paddingLeft: Spacing[4],
    paddingRight: Spacing[2],
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: Typography.base,
    color: D.text,
    maxHeight: 120,
    paddingTop: 2,
    paddingBottom: 2,
  },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 2 },
  iconBtn: { padding: 4 },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
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
  const { messagesByGroup, loadingByGroup, hasMoreByGroup, fetchMessages, loadMoreMessages, clearGroup } =
    useGroupChatStore();

  const group = groups.find((g) => g.id === groupId);
  const messages = messagesByGroup[groupId] ?? [];
  const isLoading = loadingByGroup[groupId] ?? false;
  const hasMore = hasMoreByGroup[groupId] ?? false;

  const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (group?.isMember) {
      fetchMessages(groupId);
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
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
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
