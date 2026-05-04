import { create } from 'zustand';
import { api, mapFriendship } from '../lib/apiClient';
import type { Friendship } from '../types';

interface FriendsState {
  friends: Friendship[];
  incomingRequests: Friendship[];
  isLoading: boolean;
  hasFetched: boolean;
  fetchFriends: () => Promise<void>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  rejectRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  clearAll: () => void;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  incomingRequests: [],
  isLoading: false,
  hasFetched: false,

  fetchFriends: async () => {
    set({ isLoading: true });
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.getFriends(),
        api.getIncomingRequests(),
      ]);
      set({
        friends: friendsRes.friends.map(mapFriendship),
        incomingRequests: requestsRes.requests.map(mapFriendship),
        hasFetched: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  acceptRequest: async (friendshipId) => {
    await api.respondToFriendRequest(friendshipId, 'accepted');
    const accepted = get().incomingRequests.find((r) => r.id === friendshipId);
    set((s) => ({
      incomingRequests: s.incomingRequests.filter((r) => r.id !== friendshipId),
      friends: accepted
        ? [{ ...accepted, status: 'accepted' }, ...s.friends]
        : s.friends,
    }));
  },

  rejectRequest: async (friendshipId) => {
    await api.respondToFriendRequest(friendshipId, 'rejected');
    set((s) => ({
      incomingRequests: s.incomingRequests.filter((r) => r.id !== friendshipId),
    }));
  },

  clearAll: () => {
    set({ friends: [], incomingRequests: [], isLoading: false, hasFetched: false });
  },

  removeFriend: async (friendshipId) => {
    await api.removeFriendship(friendshipId);
    set((s) => ({
      friends: s.friends.filter((f) => f.id !== friendshipId),
    }));
  },
}));
