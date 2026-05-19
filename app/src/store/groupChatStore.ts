import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GroupMessage } from '../types';
import { api, mapGroupMessage } from '../lib/apiClient';
import { useAuthStore } from './authStore';
import { usePrayerStore } from './prayerStore';

const LAST_READ_KEY = 'nave_last_read_by_group';

let _persistTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingPersist: Record<string, string> | null = null;

// Debounce AsyncStorage writes — mark-as-read fires per scroll cycle, no need
// to hit disk that often.
function persistLastRead(lastReadIdByGroup: Record<string, string>): void {
  _pendingPersist = lastReadIdByGroup;
  if (_persistTimer) return;
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    const toWrite = _pendingPersist;
    _pendingPersist = null;
    if (toWrite) {
      AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify(toWrite)).catch(() => {});
    }
  }, 500);
}

// Returns a partial state patch that advances lastReadIdByGroup for `groupId`
// to `newId` (and persists), or an empty patch if `newId` is falsy. Spread into
// a `set` return value alongside other state updates.
function advanceLastRead(
  s: { lastReadIdByGroup: Record<string, string> },
  groupId: string,
  newId: string | undefined,
): { lastReadIdByGroup: Record<string, string> } | {} {
  if (!newId) return {};
  const updated = { ...s.lastReadIdByGroup, [groupId]: newId };
  persistLastRead(updated);
  return { lastReadIdByGroup: updated };
}

// Replace an optimistic temp message with the real one. If lastRead pointed at
// the temp id, advance it to the real id so the user-authored message stays
// "read".
function replaceOptimistic(
  s: GroupChatState,
  groupId: string,
  tempId: string,
  real: GroupMessage,
) {
  const advance = s.lastReadIdByGroup[groupId] === tempId ? real.id : undefined;
  return {
    messagesByGroup: {
      ...s.messagesByGroup,
      [groupId]: (s.messagesByGroup[groupId] ?? []).map((m) =>
        m.id === tempId ? real : m,
      ),
    },
    ...advanceLastRead(s, groupId, advance),
  };
}

// Bump/drop the in-flight send counter for a group. Spread into a `set`
// return alongside other patches. Floors at zero so a stray decrement can't
// poison the gate.
function bumpInFlight(s: GroupChatState, groupId: string, delta: 1 | -1) {
  const current = s.inFlightSendsByGroup[groupId] ?? 0;
  const next = Math.max(0, current + delta);
  return { inFlightSendsByGroup: { ...s.inFlightSendsByGroup, [groupId]: next } };
}

// Remove an optimistic temp message (rollback or pending-review). If lastRead
// pointed at the removed id, fall back to the new latest message so we don't
// leave a dangling pointer that breaks unread counting.
function removeOptimistic(s: GroupChatState, groupId: string, tempId: string) {
  const newMessages = (s.messagesByGroup[groupId] ?? []).filter((m) => m.id !== tempId);
  const advance =
    s.lastReadIdByGroup[groupId] === tempId ? newMessages[0]?.id : undefined;
  return {
    messagesByGroup: { ...s.messagesByGroup, [groupId]: newMessages },
    ...advanceLastRead(s, groupId, advance),
  };
}

interface GroupChatState {
  messagesByGroup: Record<string, GroupMessage[]>;
  cursorByGroup: Record<string, string | null>;
  hasMoreByGroup: Record<string, boolean>;
  loadingByGroup: Record<string, boolean>;
  lastReadIdByGroup: Record<string, string>;
  activePollGroupId: string | null;
  // Per-group count of sends whose server response hasn't landed. While
  // non-zero, polls/FCM refetches must NOT prepend self-authored messages —
  // those would duplicate the still-resident optimistic, since they have a
  // different id. `replaceOptimistic` is the single writer of the real row.
  inFlightSendsByGroup: Record<string, number>;
  // Cached unread counts. Both populated by a single subscription; reading
  // these primitives avoids re-derive churn from per-poll messagesByGroup
  // reference changes. `totalUnreadCount` excludes muted groups (drives the
  // tab badge); `unreadCountByGroup` does NOT (drives per-group dots in
  // GroupScreen, which renders dots regardless of mute state).
  totalUnreadCount: number;
  unreadCountByGroup: Record<string, number>;
  clearAll: () => void;
  setActivePollGroupId: (groupId: string | null) => void;

  fetchMessages: (groupId: string) => Promise<void>;
  loadMoreMessages: (groupId: string) => Promise<void>;
  sendMessage: (groupId: string, content: string) => Promise<{ pendingReview: boolean }>;
  sendImageMessage: (groupId: string, uri: string, type: string, caption?: string) => Promise<void>;
  deleteMessage: (groupId: string, messageId: string) => Promise<void>;
  toggleReaction: (groupId: string, messageId: string) => Promise<void>;
  clearGroup: (groupId: string) => void;
  markGroupAsRead: (groupId: string) => void;
  hydrateLastRead: () => Promise<void>;
  loadGroupBaseline: (groupId: string) => Promise<void>;
  appendNewMessages: (groupId: string, messages: GroupMessage[]) => void;
}

export const useGroupChatStore = create<GroupChatState>((set, get) => ({
  messagesByGroup: {},
  cursorByGroup: {},
  hasMoreByGroup: {},
  loadingByGroup: {},
  lastReadIdByGroup: {},
  activePollGroupId: null,
  inFlightSendsByGroup: {},
  totalUnreadCount: 0,
  unreadCountByGroup: {},

  setActivePollGroupId: (groupId: string | null) => set({ activePollGroupId: groupId }),

  fetchMessages: async (groupId: string) => {
    if (get().loadingByGroup[groupId]) return;
    set((s) => ({ loadingByGroup: { ...s.loadingByGroup, [groupId]: true } }));
    try {
      const data = await api.getGroupMessages(groupId);
      const messages = data.messages.map(mapGroupMessage);
      set((s) => ({
        messagesByGroup: { ...s.messagesByGroup, [groupId]: messages },
        cursorByGroup: { ...s.cursorByGroup, [groupId]: data.next_cursor ?? null },
        hasMoreByGroup: { ...s.hasMoreByGroup, [groupId]: data.next_cursor != null },
        loadingByGroup: { ...s.loadingByGroup, [groupId]: false },
      }));
    } catch {
      set((s) => ({ loadingByGroup: { ...s.loadingByGroup, [groupId]: false } }));
    }
  },

  loadMoreMessages: async (groupId: string) => {
    const { loadingByGroup, hasMoreByGroup, cursorByGroup } = get();
    if (loadingByGroup[groupId] || !hasMoreByGroup[groupId]) return;
    const cursor = cursorByGroup[groupId];
    if (!cursor) return;

    set((s) => ({ loadingByGroup: { ...s.loadingByGroup, [groupId]: true } }));
    try {
      const data = await api.getGroupMessages(groupId, cursor);
      const older = data.messages.map(mapGroupMessage);
      set((s) => ({
        // existing array is newest-first; append older messages at the end
        messagesByGroup: {
          ...s.messagesByGroup,
          [groupId]: [...(s.messagesByGroup[groupId] ?? []), ...older],
        },
        cursorByGroup: { ...s.cursorByGroup, [groupId]: data.next_cursor ?? null },
        hasMoreByGroup: { ...s.hasMoreByGroup, [groupId]: data.next_cursor != null },
        loadingByGroup: { ...s.loadingByGroup, [groupId]: false },
      }));
    } catch {
      set((s) => ({ loadingByGroup: { ...s.loadingByGroup, [groupId]: false } }));
    }
  },

  sendMessage: async (groupId: string, content: string) => {
    const { user } = useAuthStore.getState();
    const tempId = `pending-${Date.now()}`;
    const optimistic: GroupMessage = {
      id: tempId,
      groupId,
      author: {
        id: user?.id ?? '',
        username: user?.username ?? '',
        displayName: user?.displayName ?? '',
        avatarUrl: user?.avatarUrl,
      },
      content,
      imageUrl: undefined,
      reactionCount: 0,
      userReacted: false,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      messagesByGroup: {
        ...s.messagesByGroup,
        [groupId]: [optimistic, ...(s.messagesByGroup[groupId] ?? [])],
      },
      ...advanceLastRead(s, groupId, tempId),
      ...bumpInFlight(s, groupId, 1),
    }));

    try {
      const raw = await api.sendGroupMessage(groupId, content) as Awaited<ReturnType<typeof api.sendGroupMessage>> & { _moderation?: { status: string } };
      const pendingReview = raw._moderation?.status === 'pending_review';

      if (pendingReview) {
        // Remove the optimistic message — it won't appear until an admin approves it
        set((s) => removeOptimistic(s, groupId, tempId));
      } else {
        const message = mapGroupMessage(raw);
        set((s) => replaceOptimistic(s, groupId, tempId, message));
      }
      return { pendingReview };
    } catch (err) {
      set((s) => removeOptimistic(s, groupId, tempId));
      throw err;
    } finally {
      set((s) => bumpInFlight(s, groupId, -1));
    }
  },

  sendImageMessage: async (groupId: string, uri: string, type: string, caption?: string) => {
    const { user } = useAuthStore.getState();
    const tempId = `pending-${Date.now()}`;
    const optimistic: GroupMessage = {
      id: tempId,
      groupId,
      author: {
        id: user?.id ?? '',
        username: user?.username ?? '',
        displayName: user?.displayName ?? '',
        avatarUrl: user?.avatarUrl,
      },
      content: caption,
      imageUrl: uri,
      localImageUrl: uri,
      reactionCount: 0,
      userReacted: false,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    set((s) => ({
      messagesByGroup: {
        ...s.messagesByGroup,
        [groupId]: [optimistic, ...(s.messagesByGroup[groupId] ?? [])],
      },
      ...advanceLastRead(s, groupId, tempId),
      ...bumpInFlight(s, groupId, 1),
    }));

    try {
      const { image_id } = await api.uploadGroupMessageImage(groupId, uri, type);
      const raw = await api.sendGroupImageMessage(groupId, image_id, caption);
      // Carry the local file URI onto the swapped-in real message so the
      // bubble keeps rendering from the same source — the GCS URL is held in
      // `imageUrl` for the lightbox and for future sessions, but the in-chat
      // image stays anchored to the local file for this session.
      const message: GroupMessage = { ...mapGroupMessage(raw), localImageUrl: uri };
      set((s) => replaceOptimistic(s, groupId, tempId, message));
    } catch (err) {
      set((s) => removeOptimistic(s, groupId, tempId));
      throw err;
    } finally {
      set((s) => bumpInFlight(s, groupId, -1));
    }
  },

  deleteMessage: async (groupId: string, messageId: string) => {
    const prev = get().messagesByGroup[groupId] ?? [];
    const prevLastRead = get().lastReadIdByGroup[groupId];
    // Optimistic remove. If lastRead pointed at the deleted message, advance
    // to the new latest so unread counting doesn't see a -1 from findIndex.
    set((s) => {
      const newMessages = (s.messagesByGroup[groupId] ?? []).filter((m) => m.id !== messageId);
      const advance =
        s.lastReadIdByGroup[groupId] === messageId ? newMessages[0]?.id : undefined;
      return {
        messagesByGroup: { ...s.messagesByGroup, [groupId]: newMessages },
        ...advanceLastRead(s, groupId, advance),
      };
    });
    try {
      await api.deleteGroupMessage(groupId, messageId);
    } catch {
      // Rollback both arrays
      set((s) => ({
        messagesByGroup: { ...s.messagesByGroup, [groupId]: prev },
        lastReadIdByGroup: prevLastRead
          ? { ...s.lastReadIdByGroup, [groupId]: prevLastRead }
          : s.lastReadIdByGroup,
      }));
    }
  },

  toggleReaction: async (groupId: string, messageId: string) => {
    const messages = get().messagesByGroup[groupId] ?? [];
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const willReact = !msg.userReacted;
    const optimistic = {
      reactionCount: msg.reactionCount + (willReact ? 1 : -1),
      userReacted: willReact,
    };

    set((s) => ({
      messagesByGroup: {
        ...s.messagesByGroup,
        [groupId]: (s.messagesByGroup[groupId] ?? []).map((m) =>
          m.id === messageId ? { ...m, ...optimistic } : m,
        ),
      },
    }));

    try {
      const raw = await api.toggleGroupMessageReaction(groupId, messageId);
      set((s) => ({
        messagesByGroup: {
          ...s.messagesByGroup,
          [groupId]: (s.messagesByGroup[groupId] ?? []).map((m) =>
            m.id === messageId
              ? { ...m, reactionCount: raw.reaction_count, userReacted: raw.user_reacted }
              : m,
          ),
        },
      }));
    } catch {
      set((s) => ({
        messagesByGroup: {
          ...s.messagesByGroup,
          [groupId]: (s.messagesByGroup[groupId] ?? []).map((m) =>
            m.id === messageId
              ? { ...m, reactionCount: msg.reactionCount, userReacted: msg.userReacted }
              : m,
          ),
        },
      }));
    }
  },

  markGroupAsRead: (groupId: string) => {
    const messages = get().messagesByGroup[groupId];
    const latestId = messages?.[0]?.id;
    if (latestId) {
      set((s) => {
        const updated = { ...s.lastReadIdByGroup, [groupId]: latestId };
        persistLastRead(updated);
        return { lastReadIdByGroup: updated };
      });
    }
  },

  hydrateLastRead: async () => {
    try {
      const json = await AsyncStorage.getItem(LAST_READ_KEY);
      if (json) {
        // Drop any `pending-*` ids — they're client-only optimistic markers
        // that won't appear in server data after a relaunch, so leaving them
        // in would make `findIndex` return -1 and inflate the unread count.
        // loadGroupBaseline will re-seed lastReadId from the server's latest.
        const parsed = JSON.parse(json) as Record<string, string>;
        const cleaned: Record<string, string> = {};
        let droppedAny = false;
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string' && v.startsWith('pending-')) {
            droppedAny = true;
            continue;
          }
          cleaned[k] = v;
        }
        if (droppedAny) persistLastRead(cleaned);
        set({ lastReadIdByGroup: cleaned });
      }
    } catch {}
  },

  loadGroupBaseline: async (groupId: string) => {
    // Guard: skip if messages are already loaded for this group, or if a load is in progress
    const { messagesByGroup, loadingByGroup } = get();
    if (messagesByGroup[groupId] || loadingByGroup[groupId]) return;
    set((s) => ({ loadingByGroup: { ...s.loadingByGroup, [groupId]: true } }));
    try {
      const data = await api.getGroupMessages(groupId, undefined, 20);
      const messages = data.messages.map(mapGroupMessage);
      const latestId = messages[0]?.id;
      set((s) => {
        // Only set baseline lastReadId if not already set (e.g. from AsyncStorage hydration or a prior chat visit)
        const alreadyRead = !!s.lastReadIdByGroup[groupId];
        const newLastReadIdByGroup = !alreadyRead && latestId
          ? { ...s.lastReadIdByGroup, [groupId]: latestId }
          : s.lastReadIdByGroup;
        if (!alreadyRead && latestId) persistLastRead(newLastReadIdByGroup);
        return {
          messagesByGroup: { ...s.messagesByGroup, [groupId]: messages },
          cursorByGroup: { ...s.cursorByGroup, [groupId]: data.next_cursor ?? null },
          hasMoreByGroup: { ...s.hasMoreByGroup, [groupId]: data.next_cursor != null },
          loadingByGroup: { ...s.loadingByGroup, [groupId]: false },
          lastReadIdByGroup: newLastReadIdByGroup,
        };
      });
    } catch {
      set((s) => ({ loadingByGroup: { ...s.loadingByGroup, [groupId]: false } }));
    }
  },

  appendNewMessages: (groupId: string, newMessages: GroupMessage[]) => {
    if (newMessages.length === 0) return;
    set((s) => {
      // While a send is in flight, drop self-authored arrivals: their server
      // row has a different id than the still-resident optimistic, so dedup
      // can't catch them and they'd duplicate after `replaceOptimistic`.
      const currentUserId = useAuthStore.getState().user?.id;
      const guardSelf = (s.inFlightSendsByGroup[groupId] ?? 0) > 0 && !!currentUserId;
      const incoming = guardSelf
        ? newMessages.filter((m) => m.author.id !== currentUserId)
        : newMessages;
      if (incoming.length === 0) return s;
      const existing = s.messagesByGroup[groupId] ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const deduped = incoming.filter((m) => !existingIds.has(m.id));
      if (deduped.length === 0) return s;
      return {
        messagesByGroup: {
          ...s.messagesByGroup,
          [groupId]: [...deduped.reverse(), ...existing],
        },
      };
    });
  },

  clearAll: () => {
    set({
      messagesByGroup: {},
      cursorByGroup: {},
      hasMoreByGroup: {},
      loadingByGroup: {},
      lastReadIdByGroup: {},
      activePollGroupId: null,
      inFlightSendsByGroup: {},
      totalUnreadCount: 0,
      unreadCountByGroup: {},
    });
  },

  clearGroup: (groupId: string) => {
    set((s) => {
      const messagesByGroup = { ...s.messagesByGroup };
      const cursorByGroup = { ...s.cursorByGroup };
      const hasMoreByGroup = { ...s.hasMoreByGroup };
      const loadingByGroup = { ...s.loadingByGroup };
      const unreadCountByGroup = { ...s.unreadCountByGroup };
      delete messagesByGroup[groupId];
      delete cursorByGroup[groupId];
      delete hasMoreByGroup[groupId];
      delete loadingByGroup[groupId];
      delete unreadCountByGroup[groupId];
      return { messagesByGroup, cursorByGroup, hasMoreByGroup, loadingByGroup, unreadCountByGroup };
    });
  },
}));

// ─── Derived: unreadCountByGroup + totalUnreadCount ──────────────────────────
// Both caches are populated in a single pass by a subscription. Reading these
// primitives lets the tab badge and per-group dots re-render only when the
// count actually changes, not on every poll-driven reference change.
//
// Self-authored messages are excluded from the count: you can't have an
// "unread" message you sent yourself. This makes the count immune to the
// race window between the optimistic send, the server response, and any
// poll/FCM refetch that may return the user's own real message before
// `replaceOptimistic` lands.

function countUnreadInGroup(
  messages: GroupMessage[] | undefined,
  lastReadId: string | undefined,
  currentUserId: string | undefined,
): number {
  if (!messages || messages.length === 0) return 0;
  const idx = lastReadId ? messages.findIndex((m) => m.id === lastReadId) : -1;
  // idx === -1: either no lastRead, or lastRead is older than our fetched
  // window, or lastRead points at a now-deleted message. In all three cases
  // we walk the full window. Self-authored exclusion still applies.
  const end = idx === -1 ? messages.length : idx;
  let count = 0;
  for (let i = 0; i < end; i++) {
    if (messages[i].author.id !== currentUserId) count++;
  }
  return count;
}

function shallowEqualNumberMap(
  a: Record<string, number>,
  b: Record<string, number>,
): boolean {
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

function refreshUnreadCaches(): void {
  const state = useGroupChatStore.getState();
  const mutedIds = usePrayerStore.getState().mutedGroupIds;
  const currentUserId = useAuthStore.getState().user?.id;
  const { messagesByGroup, lastReadIdByGroup } = state;

  const nextByGroup: Record<string, number> = {};
  let nextTotal = 0;
  for (const id of Object.keys(messagesByGroup)) {
    const n = countUnreadInGroup(messagesByGroup[id], lastReadIdByGroup[id], currentUserId);
    nextByGroup[id] = n;
    if (!mutedIds.has(id)) nextTotal += n;
  }

  const patch: Partial<GroupChatState> = {};
  if (nextTotal !== state.totalUnreadCount) patch.totalUnreadCount = nextTotal;
  if (!shallowEqualNumberMap(nextByGroup, state.unreadCountByGroup)) {
    patch.unreadCountByGroup = nextByGroup;
  }
  if (Object.keys(patch).length > 0) useGroupChatStore.setState(patch);
}

useGroupChatStore.subscribe((state, prev) => {
  if (
    state.messagesByGroup !== prev.messagesByGroup ||
    state.lastReadIdByGroup !== prev.lastReadIdByGroup
  ) {
    refreshUnreadCaches();
  }
});

usePrayerStore.subscribe((state, prev) => {
  if (state.mutedGroupIds !== prev.mutedGroupIds) {
    refreshUnreadCaches();
  }
});
