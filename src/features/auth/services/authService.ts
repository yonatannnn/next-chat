import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';

export interface UserData {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  password?: string; // Store hashed password for reference
}

export const authService = {
  async register(email: string, password: string, username: string, name?: string, avatar?: string) {
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
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() as UserData : null;
      
      return { user, userData };
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async logout() {
    try {
      await signOut(auth);
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async getUserData(userId: string): Promise<UserData | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists() ? userDoc.data() as UserData : null;
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  async checkUsernameAvailability(username: string, currentUserId?: string): Promise<boolean> {
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
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async updateProfile(userId: string, updates: Partial<Omit<UserData, 'id' | 'email'>>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async uploadAvatar(file: File, userId: string): Promise<string> {
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
