import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      userData: null, // Additional user data from Firestore
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setUserData: (userData) => set({ userData }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.signInWithEmailAndPassword(email, password);
          if (result.success) {
            // Get additional user data from Firestore
            const userDataResult = await authService.getUserData(result.user.uid);
            if (userDataResult.success) {
              set({ 
                user: result.user, 
                userData: userDataResult.data,
                isAuthenticated: true, 
                isLoading: false 
              });
            } else {
              set({ 
                user: result.user, 
                userData: null,
                isAuthenticated: true, 
                isLoading: false 
              });
            }
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      logout: async () => {
        try {
          await authService.signOut();
          set({ user: null, userData: null, isAuthenticated: false, error: null });
        } catch (error) {
          set({ error: error.message });
        }
      },
      
      register: async (email, password, username, name = null, avatar = null) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.createUserWithEmailAndPassword(email, password, username, name, avatar);
          if (result.success) {
            set({ 
              user: result.user, 
              userData: result.userData,
              isAuthenticated: true, 
              isLoading: false 
            });
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      updateProfile: async (updateData) => {
        const { user } = get();
        if (!user) return { success: false, error: 'Not authenticated' };

        set({ isLoading: true, error: null });
        try {
          const result = await authService.updateUserProfile(user.uid, updateData);
          if (result.success) {
            // Update local user data
            const userDataResult = await authService.getUserData(user.uid);
            if (userDataResult.success) {
              set({ userData: userDataResult.data, isLoading: false });
            }
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      searchUsers: async (searchTerm) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.searchUsers(searchTerm);
          set({ isLoading: false });
          return result;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        user: state.user, 
        userData: state.userData,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export default useAuthStore;
