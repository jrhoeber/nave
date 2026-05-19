import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import Clipboard from '@react-native-clipboard/clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { ImageX } from '../../components/ui/ImageX';
import { Button } from '../../components/ui/Button';
import { FullScreenImageViewer } from '../../components/ui/FullScreenImageViewer';
import { usePrayerStore } from '../../store/prayerStore';
import { useGroupChatStore } from '../../store/groupChatStore';
import { useAuthStore } from '../../store/authStore';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { GroupMessage } from '../../types';
import type { GroupMessageRouteProp, RootNavigationProp } from '../../types/navigation';
import { api, ApiError, mapGroupMessage } from '../../lib/apiClient';
import { markNotificationsRead } from '../../lib/notifications';

// ─── Category labels ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  bible_study: 'Bible Study',
  mens_group: "Men's Group",
  womens_group: "Women's Group",
  young_adults: 'Young Adults',
  families: 'Families',
  devotional: 'Devotional',
  general: 'General',
};

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
      <Text style={sepStyles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

const sepStyles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: Spacing[5], marginBottom: Spacing[2] },
  label: {
    fontSize: Typography.xs,
    color: D.textMuted,
    fontWeight: Typography.semibold,
    letterSpacing: 1,
  },
});

// ─── Message Context Menu ────────────────────────────────────────────────────

interface MessageContextMenuProps {
  visible: boolean;
  message: GroupMessage | null;
  groupId: string;
  isOwnMessage: boolean;
  onDismiss: () => void;
  onReport: (messageId: string) => void;
  onDelete: (messageId: string) => void;
}

function MessageContextMenu({ visible, message, groupId, isOwnMessage, onDismiss, onReport, onDelete }: MessageContextMenuProps) {
  const toggleReaction = useGroupChatStore((s) => s.toggleReaction);

  const handleHeart = useCallback(async () => {
    if (!message) return;
    onDismiss();
    await toggleReaction(groupId, message.id);
  }, [groupId, message, toggleReaction, onDismiss]);

  const handleCopy = useCallback(() => {
    if (!message?.content) return;
    Clipboard.setString(message.content);
    onDismiss();
  }, [message, onDismiss]);

  const handleReport = useCallback(() => {
    if (!message) return;
    onDismiss();
    onReport(message.id);
  }, [message, onDismiss, onReport]);

  const handleDelete = useCallback(() => {
    if (!message) return;
    onDismiss();
    onDelete(message.id);
  }, [message, onDismiss, onDelete]);

  if (!message) return null;

  const hasReacted = message.userReacted;

  const menuItems: Array<{ label: string; icon: string; onPress: () => void; destructive?: boolean }> = [];

  menuItems.push({
    label: hasReacted ? 'Unlike' : 'Like',
    icon: hasReacted ? 'heart' : 'heart-outline',
    onPress: handleHeart,
  });
  if (message.content) {
    menuItems.push({ label: 'Copy', icon: 'copy-outline', onPress: handleCopy });
  }
  if (isOwnMessage) {
    menuItems.push({ label: 'Delete', icon: 'trash-outline', onPress: handleDelete, destructive: true });
  } else {
    menuItems.push({ label: 'Report', icon: 'flag-outline', onPress: handleReport });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={ctxStyles.overlay} onPress={onDismiss}>
        <View style={ctxStyles.content} onStartShouldSetResponder={() => true}>
          {/* Message preview */}
          <View style={ctxStyles.messagePreview}>
            <View style={ctxStyles.messageHeader}>
              <Avatar name={message.author.displayName} uri={message.author.avatarUrl} size={32} />
              <Text style={ctxStyles.authorName}>{message.author.displayName}</Text>
              <Text style={ctxStyles.messageTime}>{formatMessageTime(message.createdAt)}</Text>
            </View>
            {(message.localImageUrl ?? message.imageUrl) && (
              <ImageX source={{ uri: message.localImageUrl ?? message.imageUrl }} style={ctxStyles.messageImage} contentFit="cover" />
            )}
            {message.content ? (
              <Text style={ctxStyles.messageText}>{message.content}</Text>
            ) : null}
          </View>

          {/* Action menu */}
          <View style={ctxStyles.menuContainer}>
            {menuItems.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  ctxStyles.menuItem,
                  idx < menuItems.length - 1 && ctxStyles.menuItemBorder,
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <Text style={[ctxStyles.menuLabel, item.destructive && ctxStyles.menuLabelDestructive]}>
                  {item.label}
                </Text>
                <Icon
                  name={item.icon}
                  size={20}
                  color={item.destructive ? Colors.error : item.label === 'Like' || item.label === 'Unlike' ? Colors.heart : Colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const ctxStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: D.overlay,
    justifyContent: 'center',
    paddingHorizontal: Spacing[4],
  },
  content: {
    gap: Spacing[2],
  },
  // Message preview
  messagePreview: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    ...Shadows.md,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  authorName: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  messageTime: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  messageImage: {
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
    marginBottom: Spacing[2],
  },
  messageText: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    lineHeight: Typography.base * 1.5,
  },
  // Action menu
  menuContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    minWidth: 240,
    ...Shadows.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuLabel: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  menuLabelDestructive: {
    color: Colors.error,
  },
});

// ─── Message Row ─────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: GroupMessage;
  groupId: string;
  isMember: boolean;
  isOwn: boolean;
  position: MessagePosition;
  onLongPress: (messageId: string) => void;
  onAvatarPress: (userId: string) => void;
  onImagePress: (imageUrl: string) => void;
}

const MessageBubble = React.memo(function MessageBubble({ message, groupId, isMember, isOwn, position, onLongPress, onAvatarPress, onImagePress }: MessageBubbleProps) {
  const toggleReaction = useGroupChatStore((s) => s.toggleReaction);
  // Prefer the local file URI when present so the displayed URI stays stable
  // across the optimistic→server swap (otherwise the source flip from file://
  // → GCS changes ImageX's recyclingKey and the native view tears down → flash).
  const displayImageUrl = message.localImageUrl ?? message.imageUrl;
  // For the lightbox we want the canonical (higher-quality) GCS URL when we
  // have it, falling back to the local file before upload completes.
  const lightboxImageUrl = message.imageUrl ?? message.localImageUrl;
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [displayImageUrl]);

  const showAvatar = position === 'solo' || position === 'top';
  const showMeta = position === 'solo' || position === 'top';

  return (
    <Pressable
      onLongPress={() => isMember && !message.pending && onLongPress(message.id)}
      delayLongPress={350}
      style={[
        msgStyles.row,
        showMeta ? msgStyles.rowWithMeta : msgStyles.rowGrouped,
      ]}
    >
      {/* Avatar column */}
      {showAvatar ? (
        <TouchableOpacity onPress={() => onAvatarPress(message.author.id)} activeOpacity={0.7}>
          <Avatar name={message.author.displayName} uri={message.author.avatarUrl} size={40} />
        </TouchableOpacity>
      ) : (
        <View style={msgStyles.avatarSpacer} />
      )}

      {/* Content */}
      <View style={msgStyles.contentCol}>
        {showMeta && (
          <View style={msgStyles.metaRow}>
            <Text style={msgStyles.senderName}>{message.author.displayName}</Text>
            <Text style={msgStyles.time}>{formatMessageTime(message.createdAt)}</Text>
          </View>
        )}

        {displayImageUrl && !imgError && (
          <Pressable
            onPress={() => !message.pending && lightboxImageUrl && onImagePress(lightboxImageUrl)}
            onLongPress={() => isMember && !message.pending && onLongPress(message.id)}
            delayLongPress={350}
            style={msgStyles.imageWrapper}
          >
            <ImageX
              source={{ uri: displayImageUrl }}
              style={msgStyles.image}
              contentFit="cover"
              onError={() => setImgError(true)}
            />
            {message.pending && (
              <View style={msgStyles.pendingOverlay}>
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
          </Pressable>
        )}
        {displayImageUrl && imgError && (
          <View style={[msgStyles.imageWrapper, msgStyles.imageFallback]}>
            <Icon name="image-outline" size={32} color={Colors.textLight} />
          </View>
        )}

        {message.content ? (
          <Text style={msgStyles.text}>{message.content}</Text>
        ) : null}

        {/* Reactions — simple heart like parish posts */}
        {!message.pending && message.reactionCount > 0 && (
          <TouchableOpacity
            style={msgStyles.heartRow}
            onPress={() => isMember && toggleReaction(groupId, message.id)}
            activeOpacity={0.6}
          >
            <Icon
              name={message.userReacted ? 'heart' : 'heart-outline'}
              size={14}
              color={message.userReacted ? Colors.heart : Colors.textSecondary}
            />
            <Text style={[msgStyles.heartCount, message.userReacted && msgStyles.heartCountActive]}>
              {message.reactionCount}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Pressable>
  );
});

const msgStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  rowWithMeta: {
    paddingTop: Spacing[4],
    paddingBottom: 2,
  },
  rowGrouped: {
    paddingTop: 2,
    paddingBottom: 2,
  },
  avatarSpacer: { width: 40 },
  contentCol: { flex: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing[2],
    marginBottom: 4,
  },
  senderName: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: D.text,
  },
  time: {
    fontSize: Typography.sm,
    color: D.textMuted,
  },
  text: {
    fontSize: Typography.base,
    color: D.text,
    lineHeight: Typography.base * 1.5,
  },
  imageWrapper: {
    width: '75%',
    aspectRatio: 1.2,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  heartCount: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  heartCountActive: {
    color: Colors.heart,
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
  const inputRef = useRef<TextInput>(null);
  const sendMessage = useGroupChatStore((s) => s.sendMessage);
  const sendImageMessage = useGroupChatStore((s) => s.sendImageMessage);

  const hasText = text.trim().length > 0;
  const canSend = (hasText || draftPhoto !== null) && !sending;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const trimmed = text.trim();
    setSending(true);
    setText('');
    inputRef.current?.clear();
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

  const placeholder = draftPhoto ? 'Add a caption...' : 'Message ...';

  return (
    <View style={[inputStyles.wrapper, { paddingBottom: bottomInset > 0 ? bottomInset : Spacing[3] }]}>
      <View style={inputStyles.inputRow}>
        {/* + button */}
        <TouchableOpacity style={inputStyles.plusBtn} activeOpacity={0.7} onPress={handlePickPhoto} disabled={sending}>
          <Icon name="add" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Input pill */}
        <View style={inputStyles.pillRow}>
          {/* Photo preview row */}
          {draftPhoto && (
            <View style={inputStyles.photoPreviewRow}>
              <ImageX source={{ uri: draftPhoto.uri }} style={inputStyles.photoThumb} contentFit="cover" />
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

          {/* Text row */}
          <View style={inputStyles.textRow}>
            <TextInput
              ref={inputRef}
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
          </View>
        </View>

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={[inputStyles.sendBtn, !canSend && inputStyles.sendBtnDisabled]}
          activeOpacity={0.8}
          testID="group-send-btn"
        >
          {sending
            ? <ActivityIndicator size="small" color="#ffffff" />
            : <Icon name="arrow-up" size={18} color="#ffffff" />
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: {
    paddingTop: Spacing[2],
    backgroundColor: Colors.background,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing[3],
    gap: Spacing[2],
  },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  pillRow: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 22,
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
    paddingRight: Spacing[3],
  },
  input: {
    flex: 1,
    fontSize: Typography.base,
    color: D.text,
    maxHeight: 120,
    textAlignVertical: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function GroupMessageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<GroupMessageRouteProp>();
  const groupId = route.params.id;

  const groups = usePrayerStore((s) => s.groups);
  const groupsLoading = usePrayerStore((s) => s.isLoading);
  const fetchGroups = usePrayerStore((s) => s.fetchGroups);
  const joinGroup = usePrayerStore((s) => s.joinGroup);
  const user = useAuthStore((s) => s.user);
  const messagesByGroup = useGroupChatStore((s) => s.messagesByGroup);
  const loadingByGroup = useGroupChatStore((s) => s.loadingByGroup);
  const hasMoreByGroup = useGroupChatStore((s) => s.hasMoreByGroup);
  const fetchMessages = useGroupChatStore((s) => s.fetchMessages);
  const loadMoreMessages = useGroupChatStore((s) => s.loadMoreMessages);
  const markGroupAsRead = useGroupChatStore((s) => s.markGroupAsRead);
  const appendNewMessages = useGroupChatStore((s) => s.appendNewMessages);
  const isFocused = useIsFocused();

  const group = groups.find((g) => g.id === groupId);
  const messages = messagesByGroup[groupId] ?? [];
  const isLoading = loadingByGroup[groupId] ?? false;
  const hasMore = hasMoreByGroup[groupId] ?? false;

  const [contextMessage, setContextMessage] = useState<GroupMessage | null>(null);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

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
      fetchMessages(groupId);
    }
  }, [groupId, group?.isMember]);

  // While the user is actively viewing this chat, the latest message is always
  // read. Re-runs when the latest id changes (send, poll-append) or focus flips.
  const latestMessageId = messages[0]?.id;
  useEffect(() => {
    if (group?.isMember && isFocused && latestMessageId) {
      markGroupAsRead(groupId);
    }
  }, [groupId, group?.isMember, isFocused, latestMessageId, markGroupAsRead]);

  // Update latest timestamp whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      latestMessageTimestampRef.current = messages[0].createdAt;
    }
  }, [messages]);

  // Polling for new messages while screen is focused and app is active.
  // Registers as the "active" group so AppNavigator's 30s pollAll skips it.
  useEffect(() => {
    if (!group?.isMember || !isFocused) return;

    if (!latestMessageTimestampRef.current) {
      latestMessageTimestampRef.current = new Date().toISOString();
    }

    useGroupChatStore.getState().setActivePollGroupId(groupId);
    markNotificationsRead({ type: 'group_message', entityId: groupId });

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let appIsActive = AppState.currentState === 'active';

    const poll = async () => {
      if (!appIsActive) return;
      const after = latestMessageTimestampRef.current;
      if (!after) return;
      try {
        const data = await api.getGroupMessages(groupId, undefined, 50, after);
        if (data.messages.length > 0) {
          appendNewMessages(groupId, data.messages.map(mapGroupMessage));
          // User is viewing this chat, so the new arrivals are seen — mark the
          // inbox rows read so the APNS badge doesn't strand them if the user
          // backgrounds the app right after.
          markNotificationsRead({ type: 'group_message', entityId: groupId });
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    intervalId = setInterval(poll, 5000);

    const appStateSub = AppState.addEventListener('change', (state) => {
      appIsActive = state === 'active';
      if (appIsActive) poll();
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      appStateSub.remove();
      useGroupChatStore.getState().setActivePollGroupId(null);
    };
  }, [groupId, group?.isMember, isFocused]);

  const renderData = useMemo(() => buildRenderData(messages), [messages]);

  const keyExtractor = useCallback(
    (item: RenderItem) => ('type' in item && item.type === 'separator' ? item.id : (item as GroupMessage).id),
    [],
  );

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

  const handleDeleteMessage = useCallback((messageId: string) => {
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { deleteMessage } = useGroupChatStore.getState();
            await deleteMessage(groupId, messageId);
          } catch {
            Alert.alert('Error', 'Could not delete message.');
          }
        },
      },
    ]);
  }, [groupId]);

  const handleLongPress = useCallback((messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg) setContextMessage(msg);
  }, [messages]);

  const handleAvatarPress = useCallback(
    (userId: string) => navigation.navigate('UserProfile', { id: userId }),
    [navigation],
  );

  const handleImagePress = useCallback((imageUrl: string) => {
    setViewerImageUrl(imageUrl);
  }, []);

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
          onLongPress={handleLongPress}
          onAvatarPress={handleAvatarPress}
          onImagePress={handleImagePress}
        />
      );
    },
    [groupId, group?.isMember, user?.id, handleLongPress, handleAvatarPress, handleImagePress],
  );

  if (!group) {
    return (
      <View style={[styles.centered, { backgroundColor: D.bg, paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>Group not found.</Text>
        <Button label="Go Back" onPress={() => navigation.goBack()} variant="outline" />
      </View>
    );
  }

  const categoryLabel = CATEGORY_LABELS[group.category] ?? group.category;
  const subtitle = `${categoryLabel} · ${group.memberCount} member${group.memberCount !== 1 ? 's' : ''}`;

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
          <Icon name="chevron-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('GroupProfile', { id: groupId })}
        >
          <Avatar name={group.name} size={38} uri={group.avatarUrl} />
          <View style={styles.headerTextCol}>
            <Text style={styles.headerName} numberOfLines={1}>{group.name}</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('GroupProfile', { id: groupId })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.menuBtn}
        >
          <Icon name="ellipsis-horizontal" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Message list ── */}
      {group.isMember ? (
        <FlatList
          data={renderData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          windowSize={10}
          initialNumToRender={15}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === 'android'}
          ListFooterComponent={isLoading && hasMore ? <View style={{ height: 20 }} /> : null}
          ListEmptyComponent={
            isLoading ? null : (
              <View style={styles.empty}>
                <View style={styles.emptyDividerBottom} />
                <Text style={styles.emptyTitle}>
                  {'The room is quiet.\nBe the first to share.'}
                </Text>
                <View style={styles.emptyDividerTop} />
              </View>
            )
          }
        />
      ) : (
        <View style={styles.nonMemberContent}>
          <Text style={styles.nonMemberIcon}>🔒</Text>
          <Text style={styles.nonMemberTitle}>
            {group.isPendingApproval ? 'Membership pending' : 'Members only'}
          </Text>
          <Text style={styles.nonMemberSub}>
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

      {/* ── Message context menu ── */}
      <MessageContextMenu
        visible={!!contextMessage}
        message={contextMessage}
        groupId={groupId}
        isOwnMessage={contextMessage?.author.id === user?.id}
        onDismiss={() => setContextMessage(null)}
        onReport={handleReportMessage}
        onDelete={handleDeleteMessage}
      />

      {/* ── Full-screen image viewer ── */}
      <FullScreenImageViewer
        imageUrl={viewerImageUrl}
        onClose={() => setViewerImageUrl(null)}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: { paddingRight: Spacing[1] },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  headerTextCol: {
    flex: 1,
  },
  headerName: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  menuBtn: {
    padding: Spacing[1],
  },

  // List
  listContent: { paddingTop: Spacing[2], paddingBottom: Spacing[2], flexGrow: 1 },

  // Empty / non-member
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    transform: [{ scaleY: -1 }],
  },
  nonMemberContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    gap: Spacing[2],
  },
  emptyDividerTop: {
    width: 32,
    height: 2,
    backgroundColor: Colors.accent,
    marginTop: Spacing[4],
    marginBottom: Spacing[4],
    borderRadius: 1,
  },
  emptyTitle: {
    fontFamily: 'Cormorant Garamond',
    fontStyle: 'italic',
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
  },
  emptyDividerBottom: {
    width: 20,
    height: 2,
    backgroundColor: Colors.accent,
    marginTop: Spacing[6],
    marginBottom: Spacing[4],
    borderRadius: 1,
  },
  nonMemberIcon: { fontSize: 40, marginBottom: Spacing[2] },
  nonMemberTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: D.text,
    textAlign: 'center',
  },
  nonMemberSub: {
    fontSize: Typography.base,
    color: D.textMuted,
    textAlign: 'center',
    lineHeight: Typography.base * 1.5,
  },
  joinBtn: { marginTop: Spacing[3] },
});
