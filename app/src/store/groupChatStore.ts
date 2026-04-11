import { create } from 'zustand';
import type { GroupMessage } from '../types';
import { api, mapGroupMessage, mapMessageReaction } from '../lib/apiClient';

interface GroupChatState {
  messagesByGroup: Record<string, GroupMessage[]>;
  cursorByGroup: Record<string, string | null>;
  hasMoreByGroup: Record<string, boolean>;
  loadingByGroup: Record<string, boolean>;

  fetchMessages: (groupId: string) => Promise<void>;
  loadMoreMessages: (groupId: string) => Promise<void>;
  sendMessage: (groupId: string, content: string) => Promise<void>;
  deleteMessage: (groupId: string, messageId: string) => Promise<void>;
  toggleReaction: (groupId: string, messageId: string, emoji: string) => Promise<void>;
  clearGroup: (groupId: string) => void;
}

export const useGroupChatStore = create<GroupChatState>((set, get) => ({
  messagesByGroup: {},
  cursorByGroup: {},
  hasMoreByGroup: {},
  loadingByGroup: {},

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
    const raw = await api.sendGroupMessage(groupId, content);
    const message = mapGroupMessage(raw);
    set((s) => ({
      messagesByGroup: {
        ...s.messagesByGroup,
        [groupId]: [message, ...(s.messagesByGroup[groupId] ?? [])],
      },
    }));
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
    const existingIdx = msg.reactions.findIndex((r) => r.emoji === emoji);
    let optimisticReactions = msg.reactions.map((r) => ({ ...r }));
    if (existingIdx >= 0) {
      const r = optimisticReactions[existingIdx];
      if (r.count <= 1) {
        optimisticReactions = optimisticReactions.filter((_, i) => i !== existingIdx);
      } else {
        optimisticReactions[existingIdx] = { ...r, count: r.count - 1, userReacted: false };
      }
    } else {
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
