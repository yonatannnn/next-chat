import { create } from 'zustand';
import { User } from 'firebase/auth';

interface UserData {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  password?: string;
}

const AUTH_CACHE_KEY = 'auth_user_cache';

export function getCachedAuth(): UserData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (cached) return JSON.parse(cached) as UserData;
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function setCachedAuth(userData: UserData | null) {
  if (typeof window === 'undefined') return;
  try {
    if (userData) {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(userData));
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

interface AuthState {
  user: User | null;
  userData: UserData | null;
  isLoading: boolean;
  isOptimistic: boolean;
  error: string | null;
  hydrateFromCache: () => void;
  setUser: (user: User | null) => void;
  setUserData: (userData: UserData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userData: null,
  isLoading: true,
  isOptimistic: false,
  error: null,
  hydrateFromCache: () => {
    const cached = getCachedAuth();
    if (cached) {
      set({ userData: cached, isLoading: false, isOptimistic: true });
    }
  },
  setUser: (user) => set({ user }),
  setUserData: (userData) => {
    setCachedAuth(userData);
    set({ userData });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  logout: () => {
    setCachedAuth(null);
    set({ user: null, userData: null, error: null, isOptimistic: false });
  },
}));
