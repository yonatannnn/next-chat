import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface UsersState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  setUsers: (users: User[]) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  isLoading: false,
  error: null,
  setUsers: (users) => set({ users }),
  updateUser: (userId, updates) => set((state) => ({
    users: state.users.map(user => 
      user.id === userId ? { ...user, ...updates } : user
    )
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
