import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GroupMessage } from '../types';
import { api, mapGroupMessage, mapMessageReaction } from '../lib/apiClient';
import { useAuthStore } from './authStore';

const LAST_READ_KEY = 'nave_last_read_by_group';

async function persistLastRead(lastReadIdByGroup: Record<string, string>) {
  try {
    await AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify(lastReadIdByGroup));
  } catch {}
}

interface GroupChatState {
  messagesByGroup: Record<string, GroupMessage[]>;
  cursorByGroup: Record<string, string | null>;
  hasMoreByGroup: Record<string, boolean>;
  loadingByGroup: Record<string, boolean>;
  lastReadIdByGroup: Record<string, string>;

  fetchMessages: (groupId: string) => Promise<void>;
  loadMoreMessages: (groupId: string) => Promise<void>;
  sendMessage: (groupId: string, content: string) => Promise<{ pendingReview: boolean }>;
  sendImageMessage: (groupId: string, uri: string, type: string, caption?: string) => Promise<void>;
  deleteMessage: (groupId: string, messageId: string) => Promise<void>;
  toggleReaction: (groupId: string, messageId: string, emoji: string) => Promise<void>;
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
      reactions: [],
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      messagesByGroup: {
        ...s.messagesByGroup,
        [groupId]: [optimistic, ...(s.messagesByGroup[groupId] ?? [])],
      },
    }));

    try {
      const raw = await api.sendGroupMessage(groupId, content) as Awaited<ReturnType<typeof api.sendGroupMessage>> & { _moderation?: { status: string } };
      const pendingReview = raw._moderation?.status === 'pending_review';

      if (pendingReview) {
        // Remove the optimistic message — it won't appear until an admin approves it
        set((s) => ({
          messagesByGroup: {
            ...s.messagesByGroup,
            [groupId]: (s.messagesByGroup[groupId] ?? []).filter((m) => m.id !== tempId),
          },
        }));
      } else {
        const message = mapGroupMessage(raw);
        set((s) => ({
          messagesByGroup: {
            ...s.messagesByGroup,
            [groupId]: (s.messagesByGroup[groupId] ?? []).map((m) =>
              m.id === tempId ? message : m,
            ),
          },
        }));
      }
      return { pendingReview };
    } catch (err) {
      set((s) => ({
        messagesByGroup: {
          ...s.messagesByGroup,
          [groupId]: (s.messagesByGroup[groupId] ?? []).filter((m) => m.id !== tempId),
        },
      }));
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
      reactions: [],
      createdAt: new Date().toISOString(),
      pending: true,
    };

    set((s) => ({
      messagesByGroup: {
        ...s.messagesByGroup,
        [groupId]: [optimistic, ...(s.messagesByGroup[groupId] ?? [])],
      },
    }));

    try {
      const { object_name } = await api.uploadGroupMessageImage(groupId, uri, type);
      const raw = await api.sendGroupImageMessage(groupId, object_name, caption);
      const message = mapGroupMessage(raw);
      set((s) => ({
        messagesByGroup: {
          ...s.messagesByGroup,
          [groupId]: (s.messagesByGroup[groupId] ?? []).map((m) =>
            m.id === tempId ? message : m,
          ),
        },
      }));
    } catch {
      set((s) => ({
        messagesByGroup: {
          ...s.messagesByGroup,
          [groupId]: (s.messagesByGroup[groupId] ?? []).filter((m) => m.id !== tempId),
        },
      }));
      throw new Error('Failed to send photo');
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

  toggleReaction: async (groupId: string, messageId: string, emoji: string) => {
    const messages = get().messagesByGroup[groupId] ?? [];
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    // Optimistic update: toggle locally
    // Branch on userReacted — the emoji may already exist from other users.
    const existingIdx = msg.reactions.findIndex((r) => r.emoji === emoji);
    let optimisticReactions = msg.reactions.map((r) => ({ ...r }));
    if (existingIdx >= 0 && optimisticReactions[existingIdx].userReacted) {
      // User is removing their reaction
      const r = optimisticReactions[existingIdx];
      if (r.count <= 1) {
        optimisticReactions = optimisticReactions.filter((_, i) => i !== existingIdx);
      } else {
        optimisticReactions[existingIdx] = { ...r, count: r.count - 1, userReacted: false };
      }
    } else if (existingIdx >= 0) {
      // Emoji exists from other users — user is adding their reaction
      const r = optimisticReactions[existingIdx];
      optimisticReactions[existingIdx] = { ...r, count: r.count + 1, userReacted: true };
    } else {
      // New emoji
      optimisticReactions = [
        ...optimisticReactions,
        { emoji: emoji as any, count: 1, userReacted: true },
      ];
    }

    set((s) => ({
      messagesByGroup: {
        ...s.messagesByGroup,
        [groupId]: (s.messagesByGroup[groupId] ?? []).map((m) =>
          m.id === messageId ? { ...m, reactions: optimisticReactions } : m,
        ),
      },
    }));

    try {
      const rawReactions = await api.toggleGroupMessageReaction(groupId, messageId, emoji);
      const reactions = rawReactions.map(mapMessageReaction);
      set((s) => ({
        messagesByGroup: {
          ...s.messagesByGroup,
          [groupId]: (s.messagesByGroup[groupId] ?? []).map((m) =>
            m.id === messageId ? { ...m, reactions } : m,
          ),
        },
      }));
    } catch {
      // Rollback to original
      set((s) => ({
        messagesByGroup: {
          ...s.messagesByGroup,
          [groupId]: (s.messagesByGroup[groupId] ?? []).map((m) =>
            m.id === messageId ? { ...m, reactions: msg.reactions } : m,
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
