import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import useAuthStore from './src/store/useAuthStore';
import authService from './src/services/authService';

export default function App() {
  const { isAuthenticated, setUser, setUserData } = useAuthStore();

  useEffect(() => {
    // Set up Firebase auth state listener
    const unsubscribe = authService.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        // Get additional user data from Firestore
        authService.getUserData(user.uid).then((result) => {
          if (result.success) {
            setUserData(result.data);
          }
        });
      } else {
        setUser(null);
        setUserData(null);
      }
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [setUser, setUserData]);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <AppNavigator />
    </NavigationContainer>
  );
}