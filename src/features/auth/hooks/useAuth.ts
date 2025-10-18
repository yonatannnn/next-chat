import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { pushNotificationService } from '@/services/pushNotificationService';

export const useAuth = () => {
  const { 
    user, 
    userData, 
    isLoading, 
    error, 
    setUser, 
    setUserData, 
    setLoading, 
    setError, 
    logout 
  } = useAuthStore();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userData = await authService.getUserData(firebaseUser.uid);
          setUserData(userData);
        } catch (error: unknown) {
          setError(error instanceof Error ? error.message : 'An error occurred');
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setUserData, setLoading, setError]);

  const register = async (email: string, password: string, username: string, name?: string, avatar?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user, userData } = await authService.register(email, password, username, name, avatar);
      setUser(user);
      setUserData(userData);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user, userData } = await authService.login(email, password);
      setUser(user);
      setUserData(userData);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Get device ID from localStorage
      const deviceId = localStorage.getItem('push_device_id');
      await authService.logout(userData?.id, deviceId || undefined);
      logout();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    userData,
    isLoading,
    error,
    setUserData,
    register,
    login,
    logout: handleLogout,
  };
};
