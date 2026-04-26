import { create } from 'zustand';
import { api, mapBlockedUser } from '../lib/apiClient';
import type { BlockedUser } from '../types';

interface BlocksState {
  blockedUsers: BlockedUser[];
  isLoading: boolean;
  fetchBlockedUsers: () => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
}

export const useBlocksStore = create<BlocksState>((set) => ({
  blockedUsers: [],
  isLoading: false,

  fetchBlockedUsers: async () => {
    set({ isLoading: true });
    try {
      const res = await api.getBlockedUsers();
      set({ blockedUsers: res.blocked_users.map(mapBlockedUser) });
    } finally {
      set({ isLoading: false });
    }
  },

  blockUser: async (userId: string) => {
    await api.blockUser(userId);
  },

  unblockUser: async (userId: string) => {
    await api.unblockUser(userId);
    set((s) => ({
      blockedUsers: s.blockedUsers.filter((u) => u.id !== userId),
    }));
  },
}));
