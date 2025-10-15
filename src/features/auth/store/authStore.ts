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

interface AuthState {
  user: User | null;
  userData: UserData | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setUserData: (userData: UserData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userData: null,
  isLoading: true, // Start as loading to prevent premature redirects
  error: null,
  setUser: (user) => set({ user }),
  setUserData: (userData) => set({ userData }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  logout: () => set({ user: null, userData: null, error: null }),
}));
