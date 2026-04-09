import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import type { User } from '../../types';
import { api, mapUser, registerUnauthorizedHandler } from '../lib/apiClient';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  avatarReady: boolean;

  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  setAvatarReady: () => void;
}

interface SignupData {
  email: string;
  password: string;
  displayName: string;
  username: string;
  parishId?: string;
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
        if (cached.avatarUrl && !cached.avatarUrl.startsWith('http')) {
          cached.avatarUrl = undefined;
        }
        set({ token, user: cached, isAuthenticated: true });
      }
    } catch {
      // ignore
    } finally {
      // Unblock the app immediately with cached data — don't wait for the network.
      set({ isLoading: false });
    }
    // Background: fetch fresh user data and warm the image cache.
    try {
      const fresh = await api.getMe();
      const freshUser = mapUser(fresh);
      await AsyncStorage.setItem('auth_user', JSON.stringify(freshUser));
      const currentAvatarUrl = get().user?.avatarUrl;
      set({ user: { ...freshUser, avatarUrl: currentAvatarUrl || freshUser.avatarUrl } });
      if (freshUser.avatarUrl) Image.prefetch(freshUser.avatarUrl);
    } catch {
      // Use cached data if refresh fails
    }
  },

  login: async (email: string, password: string) => {
    const data = await api.login(email, password);
    const user = mapUser(data.user);
    const token = data.access_token;
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, avatarReady: false });
    if (user.avatarUrl) Image.prefetch(user.avatarUrl);
  },

  signup: async (data: SignupData) => {
    const response = await api.signup({
      username: data.username,
      display_name: data.displayName,
      email: data.email,
      password: data.password,
      parish_id: data.parishId,
    });
    const user = mapUser(response.user);
    const token = response.access_token;
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, avatarReady: false });
    if (user.avatarUrl) Image.prefetch(user.avatarUrl);
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
    set({ user: null, token: null, isAuthenticated: false, avatarReady: false });
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
