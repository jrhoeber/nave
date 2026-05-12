import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import type { User } from '../types';
import {
  api,
  mapUser,
  registerRefreshHandler,
  registerUnauthorizedHandler,
  setAccessToken,
} from '../lib/apiClient';
import { clearCachedParish, loadCachedParish } from '../lib/parishCache';
import { setUser as setCrashlyticsUser } from '../lib/crashlytics';
import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from '../lib/secureStorage';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  avatarReady: boolean;

  signInWithFirebase: (idToken: string) => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  setAvatarReady: () => void;
}

async function persistTokens(accessToken: string, refreshToken: string) {
  setAccessToken(accessToken);
  await setRefreshToken(refreshToken);
}

async function clearLocalAuth() {
  setAccessToken(null);
  await clearRefreshToken();
  await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  avatarReady: false,
  setAvatarReady: () => set({ avatarReady: true }),

  loadStoredAuth: async () => {
    try {
      const userJson = await AsyncStorage.getItem('auth_user');
      if (userJson) {
        const cached = JSON.parse(userJson) as User;
        // Signed avatar URLs expire — clear so the background refresh below
        // replaces them with fresh ones.
        cached.avatarUrl = undefined;
        cached.parishCoverPhotoUrl = undefined;
        set({ user: cached });
        setCrashlyticsUser(cached.id);
        await loadCachedParish();
      }

      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const tokens = await api.refreshSession(refreshToken);
          await persistTokens(tokens.access_token, tokens.refresh_token);
          set({ isAuthenticated: true });
        } catch {
          await clearLocalAuth();
          set({ user: null, isAuthenticated: false });
        }
      } else {
        // No refresh token. Clear any stale state from a pre-refresh-token build.
        await clearLocalAuth();
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
    await persistTokens(data.access_token, data.refresh_token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, isAuthenticated: true, avatarReady: false });
    setCrashlyticsUser(user.id);
    if (user.avatarUrl) Image.prefetch(user.avatarUrl).catch(() => {});
    if (user.parishCoverPhotoUrl) Image.prefetch(user.parishCoverPhotoUrl).catch(() => {});
    return { isNewUser: data.is_new_user };
  },

  logout: async () => {
    // Best-effort server-side revocation of this device's refresh token.
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) await api.logoutSession(refreshToken);
    } catch {
      // ignore — local cleanup proceeds regardless
    }
    await clearLocalAuth();
    set({ user: null, isAuthenticated: false, avatarReady: false });
    setCrashlyticsUser(null);
    // Clear domain stores so a different account never sees the previous user's data.
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

  logoutAll: async () => {
    try {
      await api.logoutAll();
    } catch {
      // ignore — fall through to local cleanup
    }
    await useAuthStore.getState().logout();
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

// When the API returns 401 AND refresh fails, clear auth state — RootNavigator redirects to login.
registerUnauthorizedHandler(() => {
  useAuthStore.getState().logout();
});

// 401 → attempt refresh inside apiClient. Returns new access token or null.
registerRefreshHandler(async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const tokens = await api.refreshSession(refreshToken);
    await persistTokens(tokens.access_token, tokens.refresh_token);
    return tokens.access_token;
  } catch {
    return null;
  }
});
