import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User 
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { pushNotificationService } from '@/services/pushNotificationService';

export interface UserData {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  password?: string; // Store hashed password for reference
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

const sanitizeUsername = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);

const generateUsernameCandidates = (user: User) => {
  const emailBase = user.email?.split('@')[0] || '';
  const displayBase = user.displayName || '';
  const candidates = [
    sanitizeUsername(displayBase),
    sanitizeUsername(emailBase),
    sanitizeUsername(`${displayBase}${emailBase}`),
    sanitizeUsername(`user${user.uid.slice(0, 8)}`),
  ].filter((value, index, list) => value.length >= 3 && list.indexOf(value) === index);

  return candidates.length > 0 ? candidates : [`user${user.uid.slice(0, 8)}`];
};

const getUniqueUsername = async (user: User) => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  const candidates = generateUsernameCandidates(user);

  for (const candidate of candidates) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', candidate));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty || querySnapshot.docs.every((docItem) => docItem.id === user.uid)) {
      return candidate;
    }
  }

  return `user${user.uid.slice(0, 8)}`;
};

export const authService = {
  async register(email: string, password: string, username: string, name?: string, avatar?: string) {
    if (!auth || !db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      const userData: UserData = {
        id: user.uid,
        username,
        email: user.email!,
        name: name || '',
        avatar: avatar || '',
        password: password, // Store password for reference (in real app, this should be hashed)
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      return { user, userData };
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async login(email: string, password: string) {
    if (!auth || !db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() as UserData : null;
      
      return { user, userData };
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      // Handle specific Firebase auth errors
      if (error instanceof Error) {
        if (error.message.includes('auth/user-not-found')) {
          throw new Error('No account found with this email address');
        } else if (error.message.includes('auth/wrong-password')) {
          throw new Error('Incorrect password');
        } else if (error.message.includes('auth/invalid-email')) {
          throw new Error('Invalid email address');
        } else if (error.message.includes('auth/user-disabled')) {
          throw new Error('This account has been disabled');
        } else if (error.message.includes('auth/too-many-requests')) {
          throw new Error('Too many failed attempts. Please try again later');
        } else if (error.message.includes('auth/network-request-failed')) {
          throw new Error('Network error. Please check your connection');
        } else {
          throw new Error(error.message);
        }
      }
      
      throw new Error('An unexpected error occurred during login');
    }
  },

  async signInWithGoogle() {
    if (!auth || !db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const username = await getUniqueUsername(user);
        const userData: UserData = {
          id: user.uid,
          username,
          email: user.email || '',
          name: user.displayName || '',
          avatar: user.photoURL || '',
        };

        await setDoc(userRef, userData);
        return { user, userData };
      }

      return { user, userData: userDoc.data() as UserData };
    } catch (error: unknown) {
      console.error('Google sign-in error:', error);

      if (error instanceof Error) {
        if (error.message.includes('auth/popup-closed-by-user')) {
          throw new Error('Google sign-in was cancelled');
        } else if (error.message.includes('auth/popup-blocked')) {
          throw new Error('Popup was blocked. Please allow popups and try again');
        } else if (error.message.includes('auth/account-exists-with-different-credential')) {
          throw new Error('An account already exists with this email using a different sign-in method');
        }

        throw new Error(error.message);
      }

      throw new Error('An unexpected error occurred during Google sign-in');
    }
  },

  async logout(userId?: string, deviceId?: string) {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      // Clean up push notification subscription before logout
      if (userId && deviceId) {
        try {
          await pushNotificationService.removePushSubscriptionForDevice(userId, deviceId);
          console.log('Push subscription removed for device on logout:', deviceId);
        } catch (error) {
          console.error('Failed to remove push subscription on logout:', error);
          // Don't fail logout if push cleanup fails
        }
      } else if (userId) {
        // Fallback to remove all subscriptions if no device ID
        try {
          await pushNotificationService.removePushSubscription(userId);
          console.log('All push subscriptions removed on logout');
        } catch (error) {
          console.error('Failed to remove push subscriptions on logout:', error);
          // Don't fail logout if push cleanup fails
        }
      }
      
      await signOut(auth);
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async getUserData(userId: string): Promise<UserData | null> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists() ? userDoc.data() as UserData : null;
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  onAuthStateChanged(callback: (user: User | null) => void) {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }
    return onAuthStateChanged(auth, callback);
  },

  async checkUsernameAvailability(username: string, currentUserId?: string): Promise<boolean> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      // If checking for current user, exclude their own record
      if (currentUserId) {
        return querySnapshot.empty || querySnapshot.docs.every(doc => doc.id !== currentUserId);
      }
      
      return querySnapshot.empty;
    } catch (error: unknown) {
      console.error('Username availability check error:', error);
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async updateProfile(userId: string, updates: Partial<Omit<UserData, 'id' | 'email'>>): Promise<void> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error: unknown) {
      console.error('Profile update error:', error);
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async uploadAvatar(file: File, userId: string): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(error.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Failed to upload avatar');
    }
  },
};
