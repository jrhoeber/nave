import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://api.naveapp.co';
export const JWT_KEY = 'nave_jwt';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  setToken: (token: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  setToken: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(
    () => localStorage.getItem(JWT_KEY),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        localStorage.removeItem(JWT_KEY);
        setTokenState(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const setToken = (t: string) => {
    localStorage.setItem(JWT_KEY, t);
    setTokenState(t);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    localStorage.removeItem(JWT_KEY);
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, setToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
