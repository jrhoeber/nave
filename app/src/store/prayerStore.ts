import { create } from 'zustand';
import type { PrayerGroup } from '../../types';
import { api, mapPrayerGroup } from '../lib/apiClient';

interface PrayerState {
  groups: PrayerGroup[];
  myGroups: PrayerGroup[];
  isLoading: boolean;
  mutedGroupIds: Set<string>;
  fetchGroups: () => Promise<void>;
  joinGroup: (groupId: string, groupData?: PrayerGroup) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  updateGroup: (groupId: string, data: { name?: string; description?: string; category?: PrayerGroup['category']; is_private?: boolean; meeting_schedule?: string }) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  muteGroup: (groupId: string) => Promise<void>;
  unmuteGroup: (groupId: string) => Promise<void>;
  loadMuteStatus: (groupId: string) => Promise<void>;
  uploadGroupAvatar: (groupId: string, uri: string, type: string) => Promise<void>;
  removeGroupAvatar: (groupId: string) => Promise<void>;
}

export const usePrayerStore = create<PrayerState>((set, get) => ({
  groups: [],
  myGroups: [],
  isLoading: false,
  mutedGroupIds: new Set<string>(),

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

  joinGroup: async (groupId: string, groupData?: PrayerGroup) => {
    const existingGroup = get().groups.find((g) => g.id === groupId);
    const group = existingGroup ?? groupData;
    // Optimistic update — works whether the group was already in the list or newly discovered
    if (group) {
      set((state) => {
        const alreadyInList = state.groups.some((g) => g.id === groupId);
        const updatedGroup = { ...group, isMember: true, memberCount: group.memberCount + 1 };
        const updated = alreadyInList
          ? state.groups.map((g) => g.id === groupId ? updatedGroup : g)
          : [...state.groups, updatedGroup];
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
        // Roll back on failure — remove if we added it, or reset state if it was already there
        set((state) => {
          const updated = existingGroup
            ? state.groups.map((g) =>
                g.id === groupId
                  ? { ...g, isMember: false, memberCount: Math.max(0, g.memberCount - 1) }
                  : g,
              )
            : state.groups.filter((g) => g.id !== groupId);
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

  muteGroup: async (groupId: string) => {
    set((s) => ({ mutedGroupIds: new Set([...s.mutedGroupIds, groupId]) }));
    try {
      await api.muteGroup(groupId);
    } catch {
      set((s) => {
        const updated = new Set(s.mutedGroupIds);
        updated.delete(groupId);
        return { mutedGroupIds: updated };
      });
    }
  },

  unmuteGroup: async (groupId: string) => {
    set((s) => {
      const updated = new Set(s.mutedGroupIds);
      updated.delete(groupId);
      return { mutedGroupIds: updated };
    });
    try {
      await api.unmuteGroup(groupId);
    } catch {
      set((s) => ({ mutedGroupIds: new Set([...s.mutedGroupIds, groupId]) }));
    }
  },

  loadMuteStatus: async (groupId: string) => {
    try {
      const { muted } = await api.getGroupMuteStatus(groupId);
      set((s) => {
        const updated = new Set(s.mutedGroupIds);
        if (muted) {
          updated.add(groupId);
        } else {
          updated.delete(groupId);
        }
        return { mutedGroupIds: updated };
      });
    } catch {
      // Ignore — mute status will default to false
    }
  },

  uploadGroupAvatar: async (groupId: string, uri: string, type: string) => {
    const raw = await api.uploadGroupAvatar(groupId, uri, type);
    const updated = mapPrayerGroup(raw);
    set((state) => {
      const groups = state.groups.map((g) => g.id === groupId ? updated : g);
      return { groups, myGroups: groups.filter((g) => g.isMember) };
    });
  },

  removeGroupAvatar: async (groupId: string) => {
    const raw = await api.removeGroupAvatar(groupId);
    const updated = mapPrayerGroup(raw);
    set((state) => {
      const groups = state.groups.map((g) => g.id === groupId ? updated : g);
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
