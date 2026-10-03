import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Button from '../components/ui/Button';
import useAuthStore from '../store/useAuthStore';

const ChatScreen = () => {
  const { user, userData, logout } = useAuthStore();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Mobile Chat!</Text>
        <Text style={styles.subtitle}>You're successfully connected</Text>
        
        <View style={styles.userInfo}>
          <Text style={styles.userInfoTitle}>Account Information</Text>
          <Text style={styles.userInfoText}>Email: {user?.email}</Text>
          {userData?.name && (
            <Text style={styles.userInfoText}>Name: {userData.name}</Text>
          )}
          {userData?.username && (
            <Text style={styles.userInfoText}>Username: {userData.username}</Text>
          )}
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Coming Soon</Text>
          <Text style={styles.featuresText}>• Real-time messaging</Text>
          <Text style={styles.featuresText}>• File sharing</Text>
          <Text style={styles.featuresText}>• Voice messages</Text>
          <Text style={styles.featuresText}>• Push notifications</Text>
          <Text style={styles.featuresText}>• Cross-platform sync</Text>
        </View>

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  userInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  userInfoText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  features: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  featuresText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  logoutButton: {
    width: '100%',
    maxWidth: 200,
  },
});

export default ChatScreen;