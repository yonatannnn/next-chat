import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ConversationSettings {
  id: string;
  userId: string;
  otherUserId: string;
  expirationMinutes: number | null;
  lastUpdated: Date;
}

export interface GroupSettings {
  id: string;
  groupId: string;
  userId: string;
  expirationMinutes: number | null;
  lastUpdated: Date;
}

export const conversationSettingsService = {
  /**
   * Save conversation expiration settings
   */
  async saveConversationExpiration(
    userId: string, 
    otherUserId: string, 
    expirationMinutes: number | null
  ): Promise<void> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const settingsId = `${userId}_${otherUserId}`;
      const settingsRef = doc(db, 'conversationSettings', settingsId);
      
      const settings: ConversationSettings = {
        id: settingsId,
        userId,
        otherUserId,
        expirationMinutes,
        lastUpdated: new Date()
      };

      await setDoc(settingsRef, settings);
      console.log(`Saved conversation expiration settings: ${settingsId} = ${expirationMinutes} minutes`);
    } catch (error) {
      console.error('Error saving conversation expiration settings:', error);
      throw error;
    }
  },

  /**
   * Save group conversation expiration settings
   */
  async saveGroupExpiration(
    userId: string, 
    groupId: string, 
    expirationMinutes: number | null
  ): Promise<void> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const settingsId = `${userId}_${groupId}`;
      const settingsRef = doc(db, 'groupSettings', settingsId);
      
      const settings: GroupSettings = {
        id: settingsId,
        groupId,
        userId,
        expirationMinutes,
        lastUpdated: new Date()
      };

      await setDoc(settingsRef, settings);
      console.log(`Saved group expiration settings: ${settingsId} = ${expirationMinutes} minutes`);
    } catch (error) {
      console.error('Error saving group expiration settings:', error);
      throw error;
    }
  },

  /**
   * Get conversation expiration settings
   */
  async getConversationExpiration(
    userId: string, 
    otherUserId: string
  ): Promise<number | null> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const settingsId = `${userId}_${otherUserId}`;
      const settingsRef = doc(db, 'conversationSettings', settingsId);
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        console.log(`Retrieved conversation expiration settings: ${settingsId} = ${data.expirationMinutes} minutes`);
        return data.expirationMinutes || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting conversation expiration settings:', error);
      return null;
    }
  },

  /**
   * Get group expiration settings
   */
  async getGroupExpiration(
    userId: string, 
    groupId: string
  ): Promise<number | null> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const settingsId = `${userId}_${groupId}`;
      const settingsRef = doc(db, 'groupSettings', settingsId);
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        console.log(`Retrieved group expiration settings: ${settingsId} = ${data.expirationMinutes} minutes`);
        return data.expirationMinutes || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting group expiration settings:', error);
      return null;
    }
  },

  /**
   * Get all conversation settings for a user
   */
  async getAllConversationSettings(userId: string): Promise<Map<string, number | null>> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const settingsRef = collection(db, 'conversationSettings');
      const q = query(settingsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      const settingsMap = new Map<string, number | null>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        settingsMap.set(data.otherUserId, data.expirationMinutes || null);
      });
      
      console.log(`Retrieved all conversation settings for user ${userId}:`, settingsMap);
      return settingsMap;
    } catch (error) {
      console.error('Error getting all conversation settings:', error);
      return new Map();
    }
  },

  /**
   * Get all group settings for a user
   */
  async getAllGroupSettings(userId: string): Promise<Map<string, number | null>> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const settingsRef = collection(db, 'groupSettings');
      const q = query(settingsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      const settingsMap = new Map<string, number | null>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        settingsMap.set(data.groupId, data.expirationMinutes || null);
      });
      
      console.log(`Retrieved all group settings for user ${userId}:`, settingsMap);
      return settingsMap;
    } catch (error) {
      console.error('Error getting all group settings:', error);
      return new Map();
    }
  },

  /**
   * Delete conversation settings
   */
  async deleteConversationExpiration(userId: string, otherUserId: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const settingsId = `${userId}_${otherUserId}`;
      const settingsRef = doc(db, 'conversationSettings', settingsId);
      await deleteDoc(settingsRef);
      console.log(`Deleted conversation expiration settings: ${settingsId}`);
    } catch (error) {
      console.error('Error deleting conversation expiration settings:', error);
      throw error;
    }
  },

  /**
   * Delete group settings
   */
  async deleteGroupExpiration(userId: string, groupId: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const settingsId = `${userId}_${groupId}`;
      const settingsRef = doc(db, 'groupSettings', settingsId);
      await deleteDoc(settingsRef);
      console.log(`Deleted group expiration settings: ${settingsId}`);
    } catch (error) {
      console.error('Error deleting group expiration settings:', error);
      throw error;
    }
  }
};
