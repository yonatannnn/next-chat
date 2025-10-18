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
      console.log('🔴 LOGOUT DEBUG: Starting logout process...');
      
      // Get device ID from localStorage
      const deviceId = localStorage.getItem('push_device_id');
      console.log('🔴 LOGOUT DEBUG: Device ID:', deviceId);
      console.log('🔴 LOGOUT DEBUG: User ID:', userData?.id);
      
      // Clean up local notification service worker
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          console.log('🔴 LOGOUT DEBUG: Found service workers:', registrations.length);
          
          for (const registration of registrations) {
            console.log('🔴 LOGOUT DEBUG: Unregistering service worker:', registration.scope);
            await registration.unregister();
          }
        } catch (error) {
          console.error('🔴 LOGOUT DEBUG: Error unregistering service workers:', error);
        }
      }
      
      // Clear any active notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notifications = await navigator.serviceWorker.getRegistrations();
          for (const registration of notifications) {
            const activeNotifications = await registration.getNotifications();
            console.log('🔴 LOGOUT DEBUG: Closing active notifications:', activeNotifications.length);
            activeNotifications.forEach(notification => notification.close());
          }
        } catch (error) {
          console.error('🔴 LOGOUT DEBUG: Error closing notifications:', error);
        }
      }
      
      await authService.logout(userData?.id, deviceId || undefined);
      console.log('🔴 LOGOUT DEBUG: Auth service logout completed');
      
      logout();
      console.log('🔴 LOGOUT DEBUG: Local logout completed');
    } catch (error: unknown) {
      console.error('🔴 LOGOUT DEBUG: Error during logout:', error);
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
