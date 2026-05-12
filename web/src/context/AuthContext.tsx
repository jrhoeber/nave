import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://api.naveapp.co';
export const JWT_KEY = 'nave_jwt';
export const REFRESH_KEY = 'nave_refresh';
const ADMIN_KEY = 'nave_is_admin';

// Refresh access token every 20 minutes (well under the 30-minute access-token TTL).
const REFRESH_INTERVAL_MS = 20 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setIsAdmin: (v: boolean) => void;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isAdmin: false,
  setTokens: () => {},
  setIsAdmin: () => {},
  signOut: async () => {},
  signOutAll: async () => {},
});

async function refreshAccessToken(): Promise<{ access: string; refresh: string } | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem(JWT_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    return { access: data.access_token, refresh: data.refresh_token };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(
    () => localStorage.getItem(JWT_KEY),
  );
  const [isAdmin, setIsAdminState] = useState<boolean>(
    () => localStorage.getItem(ADMIN_KEY) === 'true',
  );
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<number | null>(null);

  // Silent session restore: refresh on mount, or upgrade legacy JWT in place.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refreshExists = localStorage.getItem(REFRESH_KEY);
      if (refreshExists) {
        const tokens = await refreshAccessToken();
        if (!cancelled && tokens) setTokenState(tokens.access);
        if (!cancelled && !tokens) {
          localStorage.removeItem(JWT_KEY);
          localStorage.removeItem(REFRESH_KEY);
          localStorage.removeItem(ADMIN_KEY);
          setTokenState(null);
          setIsAdminState(false);
        }
      } else if (localStorage.getItem(JWT_KEY)) {
        // Stale legacy JWT from a pre-refresh-token build — clear it.
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(ADMIN_KEY);
        if (!cancelled) {
          setTokenState(null);
          setIsAdminState(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Firebase user observer.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(ADMIN_KEY);
        setTokenState(null);
        setIsAdminState(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Background refresh while signed in.
  useEffect(() => {
    if (!token) return;
    refreshTimer.current = window.setInterval(async () => {
      const tokens = await refreshAccessToken();
      if (tokens) setTokenState(tokens.access);
    }, REFRESH_INTERVAL_MS);
    return () => {
      if (refreshTimer.current !== null) {
        window.clearInterval(refreshTimer.current);
        refreshTimer.current = null;
      }
    };
  }, [token]);

  const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem(JWT_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    setTokenState(accessToken);
  };

  const setIsAdmin = (v: boolean) => {
    localStorage.setItem(ADMIN_KEY, String(v));
    setIsAdminState(v);
  };

  const clearLocal = () => {
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ADMIN_KEY);
    setTokenState(null);
    setIsAdminState(false);
    setUser(null);
  };

  const signOut = async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // ignore — local cleanup proceeds
      }
    }
    await firebaseSignOut(auth);
    clearLocal();
  };

  const signOutAll = async () => {
    const accessToken = localStorage.getItem(JWT_KEY);
    if (accessToken) {
      try {
        await fetch(`${API_BASE}/auth/logout-all`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch {
        // ignore
      }
    }
    await firebaseSignOut(auth);
    clearLocal();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAdmin, setTokens, setIsAdmin, signOut, signOutAll }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
