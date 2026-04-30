import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
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
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
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
import type { GroupMessageRouteProp, RootNavigationProp } from '../../types/navigation';
import { api, ApiError, mapGroupMessage } from '../../lib/apiClient';

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

type MessagePosition = 'solo' | 'top' | 'middle' | 'bottom';
type PositionedMessage = GroupMessage & { _position: MessagePosition };
type RenderItem = PositionedMessage | DateSeparatorItem;

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
    result.push({ ...msg, _position: 'solo' } as PositionedMessage);
  }
  if (currentDay !== '') {
    result.push({ type: 'separator', id: `sep-${currentDay}`, label: currentLabel });
  }

  // Compute group positions.
  // Data is newest-first; result[i-1] is newer (renders below), result[i+1] is older (renders above).
  // bottom = newest in a run (visually lowest), top = oldest in a run (visually highest).
  for (let i = 0; i < result.length; i++) {
    const item = result[i];
    if ('type' in item) continue;
    const msg = item as PositionedMessage;
    const below = result[i - 1];
    const above = result[i + 1];
    const sameAsBelow = below && !('type' in below) && (below as GroupMessage).author.id === msg.author.id;
    const sameAsAbove = above && !('type' in above) && (above as GroupMessage).author.id === msg.author.id;
    if (sameAsBelow && sameAsAbove) msg._position = 'middle';
    else if (sameAsBelow) msg._position = 'top';
    else if (sameAsAbove) msg._position = 'bottom';
    else msg._position = 'solo';
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
  isOwn: boolean;
  position: MessagePosition;
  onLongPress: (messageId: string) => void;
  onAvatarPress: (userId: string) => void;
}

function MessageBubble({ message, groupId, isMember, isOwn, position, onLongPress, onAvatarPress }: MessageBubbleProps) {
  const { toggleReaction } = useGroupChatStore();

  // Avatar appears beside the bottom (newest) message in a group, or a solo message.
  // A spacer keeps text aligned for the other bubbles in the group.
  const showAvatar = !isOwn && (position === 'solo' || position === 'bottom');
  // Name + time appear above the top (oldest) message in a group, or a solo message.
  const showMeta = !isOwn && (position === 'solo' || position === 'top');
  // Timestamp shown below the last (bottom/solo) own bubble only.
  const showOwnTime = isOwn && (position === 'solo' || position === 'bottom');

  return (
    <View style={[
      bubbleStyles.row,
      isOwn && bubbleStyles.rowOwn,
      position === 'top' && bubbleStyles.rowTop,
      position === 'middle' && bubbleStyles.rowMiddle,
      position === 'bottom' && bubbleStyles.rowBottom,
    ]}>
      {/* Avatar / spacer column for other-user messages */}
      {!isOwn && (
        showAvatar
          ? <TouchableOpacity style={bubbleStyles.avatarCol} onPress={() => onAvatarPress(message.author.id)} activeOpacity={0.7}><Avatar name={message.author.displayName} uri={message.author.avatarUrl} size={36} /></TouchableOpacity>
          : <View style={bubbleStyles.avatarSpacer} />
      )}

      {/* Content column */}
      <View style={[bubbleStyles.contentCol, isOwn && bubbleStyles.contentColOwn]}>
        {showMeta && (
          <View style={bubbleStyles.metaRow}>
            <Text style={bubbleStyles.senderName}>{message.author.displayName}</Text>
            <Text style={bubbleStyles.time}>{formatMessageTime(message.createdAt)}</Text>
          </View>
        )}

        {/* Bubble */}
        <Pressable
          onLongPress={() => isMember && !message.pending && onLongPress(message.id)}
          delayLongPress={350}
          style={[
            bubbleStyles.bubble,
            isOwn && bubbleStyles.bubbleOwn,
            !isOwn && position === 'top' && bubbleStyles.bubblePosTopOther,
            !isOwn && position === 'middle' && bubbleStyles.bubblePosMiddleOther,
            isOwn && position === 'top' && bubbleStyles.bubblePosTopOwn,
            isOwn && position === 'middle' && bubbleStyles.bubblePosMiddleOwn,
          ]}
        >
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
        </Pressable>

        {showOwnTime && (
          <Text style={bubbleStyles.timeOwn}>{formatMessageTime(message.createdAt)}</Text>
        )}

        {/* Reactions */}
        {!message.pending && message.reactions.length > 0 && (
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
                style={[chipStyles.chip, isOwn && chipStyles.chipOwn, r.userReacted && (isOwn ? chipStyles.chipActiveOwn : chipStyles.chipActive)]}
                activeOpacity={0.7}
              >
                <Text style={chipStyles.emoji}>{r.emoji}</Text>
                <Text style={[chipStyles.count, r.userReacted && chipStyles.countActive]}>
                  {r.count}
                </Text>
              </TouchableOpacity>
            ))}
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
  rowOwn: { justifyContent: 'flex-end' },
  // Tighter vertical spacing for grouped messages
  rowTop:    { paddingTop: 5, paddingBottom: 2 },
  rowMiddle: { paddingTop: 2, paddingBottom: 2 },
  rowBottom: { paddingTop: 2, paddingBottom: 5 },
  avatarCol: { marginRight: 10, marginTop: 2 },
  // Invisible spacer keeps message text aligned when avatar is hidden
  avatarSpacer: { width: 36, marginRight: 10 },
  contentCol: { flex: 1 },
  contentColOwn: { alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 },
  senderName: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: D.text },
  time: { fontSize: Typography.xs, color: D.textMuted },
  timeOwn: { fontSize: Typography.xs, color: D.textMuted, marginTop: 3 },
  bubble: {
    backgroundColor: D.bubble,
    borderRadius: Radius.lg,
    borderTopLeftRadius: 4,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    alignSelf: 'flex-start',
    maxWidth: '80%',
    overflow: 'hidden',
  },
  bubbleOwn: {
    backgroundColor: 'rgba(26,43,74,0.08)',
    alignSelf: 'flex-end',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: 4,
  },
  // Other-user group position overrides (spine = left side)
  // top: restore tl, cut bl to hint continuation downward
  bubblePosTopOther:    { borderTopLeftRadius: Radius.lg, borderBottomLeftRadius: 4 },
  // middle: tl already 4 from base; cut bl too
  bubblePosMiddleOther: { borderBottomLeftRadius: 4 },
  // Own-message group position overrides (spine = right side)
  // top: restore tr, cut br
  bubblePosTopOwn:    { borderTopRightRadius: Radius.lg, borderBottomRightRadius: 4 },
  // middle: tr already 4 from bubbleOwn; cut br too
  bubblePosMiddleOwn: { borderBottomRightRadius: 4 },
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
  reactionsScroll: { marginTop: 3 },
  reactionsContent: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: D.bubble,           // same as other-user bubble
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipOwn: {
    backgroundColor: 'rgba(26,43,74,0.08)', // same as own bubble
    borderColor: 'rgba(26,43,74,0.14)',
  },
  // Active state: color only — borderWidth unchanged so layout never shifts
  chipActive:    { borderColor: Colors.primary },
  chipActiveOwn: { borderColor: 'rgba(26,43,74,0.45)' },
  emoji: { fontSize: 13 },
  count: { fontSize: 10, color: Colors.textSecondary, fontWeight: Typography.semibold, lineHeight: 15 },
  countActive: { color: Colors.primary },
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
        const { pendingReview } = await sendMessage(groupId, trimmed);
        if (pendingReview) {
          Alert.alert('Message Under Review', 'Your message is being reviewed and will appear shortly.');
        }
      }
    } catch (err) {
      const isModerated = err instanceof ApiError && err.code === 'moderation_blocked';
      const message = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
      if (!isModerated) {
        setText(trimmed);
        if (photo) setDraftPhoto(photo);
      }
      Alert.alert(isModerated ? 'Message Not Sent' : 'Error', message);
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
            testID="group-message-input"
          />
          {canSend && (
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending}
              style={inputStyles.sendBtn}
              activeOpacity={0.8}
              testID="group-send-btn"
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

export function GroupMessageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<GroupMessageRouteProp>();
  const groupId = route.params.id;

  const { groups, isLoading: groupsLoading, fetchGroups, joinGroup, leaveGroup } = usePrayerStore();
  const { user } = useAuthStore();
  const { messagesByGroup, loadingByGroup, hasMoreByGroup, fetchMessages, loadMoreMessages, clearGroup, markGroupAsRead, appendNewMessages } =
    useGroupChatStore();
  const isFocused = useIsFocused();

  const group = groups.find((g) => g.id === groupId);
  const messages = messagesByGroup[groupId] ?? [];
  const isLoading = loadingByGroup[groupId] ?? false;
  const hasMore = hasMoreByGroup[groupId] ?? false;

  const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);

  // Track the latest message timestamp for polling
  const latestMessageTimestampRef = useRef<string | null>(null);

  // If we landed here via a notification and groups haven't been loaded yet, fetch them
  useEffect(() => {
    if (!group && !groupsLoading) {
      fetchGroups();
    }
  }, [groupId]);

  useEffect(() => {
    if (group?.isMember) {
      fetchMessages(groupId).then(() => markGroupAsRead(groupId));
    }
  }, [groupId, group?.isMember]);

  // Update latest timestamp whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      latestMessageTimestampRef.current = messages[0].createdAt;
    }
  }, [messages]);

  // 3-second polling for new messages while screen is focused and app is active
  useEffect(() => {
    if (!group?.isMember || !isFocused) return;

    // Seed the ref so polling works even if messages haven't loaded yet (or group is empty)
    if (!latestMessageTimestampRef.current) {
      latestMessageTimestampRef.current = new Date().toISOString();
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;
    // currentState can be null before it's determined asynchronously — treat null/active/inactive as active
    let appIsActive = AppState.currentState !== 'background';

    const poll = async () => {
      if (!appIsActive) return;
      const after = latestMessageTimestampRef.current;
      if (!after) return;
      try {
        const data = await api.getGroupMessages(groupId, undefined, 50, after);
        if (data.messages.length > 0) {
          appendNewMessages(groupId, data.messages.map(mapGroupMessage));
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    intervalId = setInterval(poll, 3000);

    const appStateSub = AppState.addEventListener('change', (state) => {
      appIsActive = state !== 'background';
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [groupId, group?.isMember, isFocused]);

  const renderData = useMemo(() => buildRenderData(messages), [messages]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) loadMoreMessages(groupId);
  }, [hasMore, isLoading, groupId, loadMoreMessages]);

  const handleReportMessage = useCallback((messageId: string) => {
    const reasons: Array<{ text: string; value: string }> = [
      { text: 'Spam', value: 'spam' },
      { text: 'Harassment', value: 'harassment' },
      { text: 'Hate Speech', value: 'hate_speech' },
      { text: 'Inappropriate', value: 'inappropriate' },
      { text: 'Misinformation', value: 'misinformation' },
      { text: 'Other', value: 'other' },
    ];
    Alert.alert(
      'Report Message',
      'Why are you reporting this?',
      [
        ...reasons.map((r) => ({
          text: r.text,
          onPress: async () => {
            try {
              await api.reportContent('group_message', messageId, r.value);
              Alert.alert('Report Submitted', 'Thank you. Our team will review this.');
            } catch (err) {
              if (err instanceof ApiError && err.status === 409) {
                Alert.alert('Already Reported', "You've already reported this content.");
              } else {
                Alert.alert('Error', 'Could not submit report. Please try again.');
              }
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, []);

  const handleLongPress = useCallback((messageId: string, authorId: string) => {
    if (authorId === user?.id) {
      // Own message: go straight to emoji picker
      setPickerMessageId(messageId);
      return;
    }
    Alert.alert(
      '',
      undefined,
      [
        { text: 'React', onPress: () => setPickerMessageId(messageId) },
        { text: 'Report', style: 'destructive', onPress: () => handleReportMessage(messageId) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [user?.id, handleReportMessage]);

  const renderItem = useCallback(
    ({ item }: { item: RenderItem }) => {
      if ('type' in item && item.type === 'separator') {
        return <DateSeparator label={item.label} />;
      }
      const msg = item as PositionedMessage;
      return (
        <MessageBubble
          message={msg}
          groupId={groupId}
          isMember={group?.isMember ?? false}
          isOwn={msg.author.id === user?.id}
          position={msg._position ?? 'solo'}
          onLongPress={(msgId) => handleLongPress(msgId, msg.author.id)}
          onAvatarPress={(userId) => navigation.navigate('UserProfile', { id: userId })}
        />
      );
    },
    [groupId, group?.isMember, user?.id, handleLongPress, navigation],
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

        <TouchableOpacity
          style={styles.headerTitleRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('GroupProfile', { id: groupId })}
        >
          <Text style={styles.headerName} numberOfLines={1}>{group.name}</Text>
          <Icon name="chevron-forward" size={14} color={Colors.textSecondary} style={{ marginTop: 1 }} />
        </TouchableOpacity>
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
