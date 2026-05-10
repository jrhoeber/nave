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
  totalUnreadCount: number;
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
  getUnreadCount: (groupId: string) => number;
  getTotalUnreadCount: () => number;
  appendNewMessages: (groupId: string, messages: GroupMessage[]) => void;
}

export const useGroupChatStore = create<GroupChatState>((set, get) => ({
  messagesByGroup: {},
  cursorByGroup: {},
  hasMoreByGroup: {},
  loadingByGroup: {},
  lastReadIdByGroup: {},
  activePollGroupId: null,
  totalUnreadCount: 0,

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
    }));

    try {
      const { object_name } = await api.uploadGroupMessageImage(groupId, uri, type);
      const raw = await api.sendGroupImageMessage(groupId, object_name, caption);
      const message = mapGroupMessage(raw);
      set((s) => replaceOptimistic(s, groupId, tempId, message));
    } catch (err) {
      set((s) => removeOptimistic(s, groupId, tempId));
      throw err;
    }
  },

  deleteMessage: async (groupId: string, messageId: string) => {
    const prev = get().messagesByGroup[groupId] ?? [];
    // Optimistic remove
    set((s) => ({
      messagesByGroup: {
        ...s.messagesByGroup,
        [groupId]: (s.messagesByGroup[groupId] ?? []).filter((m) => m.id !== messageId),
      },
    }));
    try {
      await api.deleteGroupMessage(groupId, messageId);
    } catch {
      // Rollback
      set((s) => ({ messagesByGroup: { ...s.messagesByGroup, [groupId]: prev } }));
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
        set({ lastReadIdByGroup: JSON.parse(json) as Record<string, string> });
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

  getUnreadCount: (groupId: string) => {
    const { messagesByGroup, lastReadIdByGroup } = get();
    const messages = messagesByGroup[groupId];
    const lastReadId = lastReadIdByGroup[groupId];
    if (!messages || !lastReadId) return 0;
    const idx = messages.findIndex((m) => m.id === lastReadId);
    // idx === -1: lastReadId is older than our fetched window → all fetched messages are unread
    return idx === -1 ? messages.length : idx;
  },

  getTotalUnreadCount: () => {
    const { messagesByGroup, lastReadIdByGroup } = get();
    return Object.keys(messagesByGroup).reduce((total, groupId) => {
      const messages = messagesByGroup[groupId];
      const lastReadId = lastReadIdByGroup[groupId];
      if (!messages || !lastReadId) return total;
      const idx = messages.findIndex((m) => m.id === lastReadId);
      return total + (idx === -1 ? messages.length : idx);
    }, 0);
  },

  appendNewMessages: (groupId: string, newMessages: GroupMessage[]) => {
    if (newMessages.length === 0) return;
    set((s) => {
      const existing = s.messagesByGroup[groupId] ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const deduped = newMessages.filter((m) => !existingIds.has(m.id));
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
      totalUnreadCount: 0,
    });
  },

  clearGroup: (groupId: string) => {
    set((s) => {
      const messagesByGroup = { ...s.messagesByGroup };
      const cursorByGroup = { ...s.cursorByGroup };
      const hasMoreByGroup = { ...s.hasMoreByGroup };
      const loadingByGroup = { ...s.loadingByGroup };
      delete messagesByGroup[groupId];
      delete cursorByGroup[groupId];
      delete hasMoreByGroup[groupId];
      delete loadingByGroup[groupId];
      return { messagesByGroup, cursorByGroup, hasMoreByGroup, loadingByGroup };
    });
  },
}));

// ─── Derived: totalUnreadCount ───────────────────────────────────────────────
// Stored as a primitive on the store so subscribers (e.g. AppNavigator's tab
// badge) can re-render only when the count actually changes — not on every
// poll-driven `messagesByGroup` reference change.

function computeTotalUnread(state: GroupChatState, mutedIds: Set<string>): number {
  let total = 0;
  const { messagesByGroup, lastReadIdByGroup } = state;
  for (const id of Object.keys(messagesByGroup)) {
    if (mutedIds.has(id)) continue;
    const msgs = messagesByGroup[id];
    const lastRead = lastReadIdByGroup[id];
    if (!msgs || !lastRead) continue;
    const idx = msgs.findIndex((m) => m.id === lastRead);
    total += idx === -1 ? msgs.length : idx;
  }
  return total;
}

function refreshTotalUnread(): void {
  const state = useGroupChatStore.getState();
  const mutedIds = usePrayerStore.getState().mutedGroupIds;
  const next = computeTotalUnread(state, mutedIds);
  if (next !== state.totalUnreadCount) {
    useGroupChatStore.setState({ totalUnreadCount: next });
  }
}

useGroupChatStore.subscribe((state, prev) => {
  if (
    state.messagesByGroup !== prev.messagesByGroup ||
    state.lastReadIdByGroup !== prev.lastReadIdByGroup
  ) {
    refreshTotalUnread();
  }
});

usePrayerStore.subscribe((state, prev) => {
  if (state.mutedGroupIds !== prev.mutedGroupIds) {
    refreshTotalUnread();
  }
});
