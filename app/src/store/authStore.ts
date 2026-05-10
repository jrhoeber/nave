import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import type { User } from '../types';
import { api, mapUser, registerUnauthorizedHandler } from '../lib/apiClient';
import { clearCachedParish, loadCachedParish } from '../lib/parishCache';
import { setUser as setCrashlyticsUser } from '../lib/crashlytics';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  avatarReady: boolean;

  signInWithFirebase: (idToken: string) => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  setAvatarReady: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  avatarReady: false,
  setAvatarReady: () => set({ avatarReady: true }),

  loadStoredAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userJson = await AsyncStorage.getItem('auth_user');
      if (token && userJson) {
        const cached = JSON.parse(userJson) as User;
        // Clear cached avatar URL — signed URLs expire after 1h,
        // so stale ones cause unhandled promise rejections.
        // Fresh URL will arrive from the background refresh below.
        cached.avatarUrl = undefined;
        cached.parishCoverPhotoUrl = undefined;
        set({ token, user: cached, isAuthenticated: true });
        setCrashlyticsUser(cached.id);
        await loadCachedParish();
      }
    } catch {
      // ignore
    } finally {
      set({ isLoading: false });
    }
    // Background: fetch fresh user data
    try {
      const fresh = await api.getMe();
      const freshUser = mapUser(fresh);
      await AsyncStorage.setItem('auth_user', JSON.stringify(freshUser));
      set({ user: freshUser });
      if (freshUser.avatarUrl) Image.prefetch(freshUser.avatarUrl).catch(() => {});
      if (freshUser.parishCoverPhotoUrl) Image.prefetch(freshUser.parishCoverPhotoUrl).catch(() => {});
    } catch {
      // Use cached data if refresh fails
    }
  },

  signInWithFirebase: async (idToken: string) => {
    const data = await api.firebaseAuth(idToken);
    const user = mapUser(data.user);
    const token = data.access_token;
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, avatarReady: false });
    setCrashlyticsUser(user.id);
    if (user.avatarUrl) Image.prefetch(user.avatarUrl).catch(() => {});
    if (user.parishCoverPhotoUrl) Image.prefetch(user.parishCoverPhotoUrl).catch(() => {});
    return { isNewUser: data.is_new_user };
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
    set({ user: null, token: null, isAuthenticated: false, avatarReady: false });
    setCrashlyticsUser(null);
    // Clear domain stores so a different account never sees the previous user's data.
    // Lazy require to avoid a startup-time circular dependency between stores.
    const { usePrayerStore } = require('./prayerStore');
    const { useGroupChatStore } = require('./groupChatStore');
    const { useFriendsStore } = require('./friendsStore');
    const { useBlocksStore } = require('./blocksStore');
    usePrayerStore.getState().clearAll();
    useGroupChatStore.getState().clearAll();
    useFriendsStore.getState().clearAll();
    useBlocksStore.getState().clearAll();
    clearCachedParish().catch(() => {});
  },

  updateUser: async (patch: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...patch };
      AsyncStorage.setItem('auth_user', JSON.stringify(updated));
      return { user: updated };
    });
  },
}));

// When the API returns 401, clear auth state — RootNavigator will redirect to login
registerUnauthorizedHandler(() => {
  useAuthStore.getState().logout();
});
