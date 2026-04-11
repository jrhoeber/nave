import { create } from 'zustand';
import type { PrayerGroup } from '../../types';
import { api, mapPrayerGroup } from '../lib/apiClient';

interface PrayerState {
  groups: PrayerGroup[];
  myGroups: PrayerGroup[];
  isLoading: boolean;
  fetchGroups: () => Promise<void>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  updateGroup: (groupId: string, data: { name?: string; description?: string; category?: PrayerGroup['category']; is_private?: boolean; meeting_schedule?: string }) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
}

export const usePrayerStore = create<PrayerState>((set, get) => ({
  groups: [],
  myGroups: [],
  isLoading: false,

  fetchGroups: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const myData = await api.getMyGroups();
      const myGroups = myData.groups.map(mapPrayerGroup);
      set({ groups: myGroups, myGroups, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  joinGroup: async (groupId: string) => {
    const group = get().groups.find((g) => g.id === groupId);
    // Optimistic update only if the group is already in the list
    if (group) {
      set((state) => {
        const updated = state.groups.map((g) =>
          g.id === groupId ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g,
        );
        return { groups: updated, myGroups: updated.filter((g) => g.isMember) };
      });
    }
    try {
      const result = await api.joinGroup(groupId);
      if (group && result.status === 'pending') {
        // Private group — roll back isMember, set pending approval
        set((state) => {
          const updated = state.groups.map((g) =>
            g.id === groupId
              ? { ...g, isMember: false, isPendingApproval: true, memberCount: g.memberCount - 1 }
              : g,
          );
          return { groups: updated, myGroups: updated.filter((g) => g.isMember) };
        });
      }
    } catch {
      if (group) {
        // Roll back on failure
        set((state) => {
          const updated = state.groups.map((g) =>
            g.id === groupId
              ? { ...g, isMember: false, memberCount: Math.max(0, g.memberCount - 1) }
              : g,
          );
          return { groups: updated, myGroups: updated.filter((g) => g.isMember) };
        });
      }
    }
  },

  updateGroup: async (groupId, data) => {
    const raw = await api.updateGroup(groupId, data);
    const updated = mapPrayerGroup(raw);
    set((state) => {
      const groups = state.groups.map((g) => g.id === groupId ? updated : g);
      return { groups, myGroups: groups.filter((g) => g.isMember) };
    });
  },

  deleteGroup: async (groupId: string) => {
    await api.deleteGroup(groupId);
    set((state) => {
      const groups = state.groups.filter((g) => g.id !== groupId);
      return { groups, myGroups: groups.filter((g) => g.isMember) };
    });
  },

  leaveGroup: async (groupId: string) => {
    // Optimistic update
    set((state) => {
      const updated = state.groups.map((g) =>
        g.id === groupId
          ? { ...g, isMember: false, memberCount: Math.max(0, g.memberCount - 1) }
          : g,
      );
      return { groups: updated, myGroups: updated.filter((g) => g.isMember) };
    });
    try {
      await api.leaveGroup(groupId);
    } catch {
      // Roll back on failure
      const group = get().groups.find((g) => g.id === groupId);
      if (!group) return;
      set((state) => {
        const updated = state.groups.map((g) =>
          g.id === groupId
            ? { ...g, isMember: true, memberCount: g.memberCount + 1 }
            : g,
        );
        return { groups: updated, myGroups: updated.filter((g) => g.isMember) };
      });
    }
  },
}));
