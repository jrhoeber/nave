import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

interface SignupData {
  email: string;
  password: string;
  displayName: string;
  username: string;
  parish?: string;
}

// Mock user for development
const MOCK_USER: User = {
  id: '1',
  username: 'john_paul',
  displayName: 'John Paul',
  bio: 'Walking the faith journey one day at a time. 🙏',
  parish: 'St. Michael the Archangel',
  diocese: 'Archdiocese of Chicago',
  location: 'Chicago, IL',
  friendCount: 24,
  prayerGroupCount: 3,
  createdAt: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  loadStoredAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userJson = await AsyncStorage.getItem('auth_user');
      if (token && userJson) {
        set({ token, user: JSON.parse(userJson), isAuthenticated: true });
      }
    } catch {
      // ignore
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (_email: string, _password: string) => {
    // TODO: replace with real API call
    const token = 'mock-jwt-token';
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(MOCK_USER));
    set({ user: MOCK_USER, token, isAuthenticated: true });
  },

  signup: async (data: SignupData) => {
    // TODO: replace with real API call
    const newUser: User = {
      ...MOCK_USER,
      displayName: data.displayName,
      username: data.username,
      parish: data.parish,
      friendCount: 0,
      prayerGroupCount: 0,
    };
    const token = 'mock-jwt-token';
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
    set({ user: newUser, token, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
