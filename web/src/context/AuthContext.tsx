import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://api.naveapp.co';
export const JWT_KEY = 'nave_jwt';
const ADMIN_KEY = 'nave_is_admin';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  setToken: (token: string) => void;
  setIsAdmin: (v: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isAdmin: false,
  setToken: () => {},
  setIsAdmin: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(
    () => localStorage.getItem(JWT_KEY),
  );
  const [isAdmin, setIsAdminState] = useState<boolean>(
    () => localStorage.getItem(ADMIN_KEY) === 'true',
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(ADMIN_KEY);
        setTokenState(null);
        setIsAdminState(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const setToken = (t: string) => {
    localStorage.setItem(JWT_KEY, t);
    setTokenState(t);
  };

  const setIsAdmin = (v: boolean) => {
    localStorage.setItem(ADMIN_KEY, String(v));
    setIsAdminState(v);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(ADMIN_KEY);
    setTokenState(null);
    setIsAdminState(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAdmin, setToken, setIsAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
