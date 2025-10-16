import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ProfileRecommendation {
  id: string;
  senderId: string;
  receiverId: string;
  imageUrl: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt?: Date;
}

export const recommendationService = {
  // Send a profile picture recommendation
  async sendRecommendation(
    senderId: string, 
    receiverId: string, 
    imageUrl: string, 
    message?: string
  ): Promise<string> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const recommendationData = {
        senderId,
        receiverId,
        imageUrl,
        message: message || '',
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'profileRecommendations'), recommendationData);
      return docRef.id;
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Failed to send recommendation');
    }
  },

  // Accept a recommendation (update user's profile picture)
  async acceptRecommendation(recommendationId: string, userId: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      // Get the recommendation data first
      const recommendationRef = doc(db, 'profileRecommendations', recommendationId);
      const recommendationDoc = await getDocs(query(
        collection(db, 'profileRecommendations'),
        where('__name__', '==', recommendationId)
      ));
      
      if (!recommendationDoc.empty) {
        const recommendationData = recommendationDoc.docs[0].data();
        
        // Update user's profile picture in users collection
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          avatar: recommendationData.imageUrl,
          updatedAt: serverTimestamp(),
        });
      }

      // Delete the recommendation after accepting
      await deleteDoc(recommendationRef);
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Failed to accept recommendation');
    }
  },

  // Reject a recommendation
  async rejectRecommendation(recommendationId: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const recommendationRef = doc(db, 'profileRecommendations', recommendationId);
      // Delete the recommendation after rejecting
      await deleteDoc(recommendationRef);
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Failed to reject recommendation');
    }
  },

  // Get recommendations for a user (only pending)
  async getRecommendations(userId: string): Promise<ProfileRecommendation[]> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const recommendationsRef = collection(db, 'profileRecommendations');
      const q = query(recommendationsRef);

      const querySnapshot = await getDocs(q);
      const allRecommendations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as ProfileRecommendation[];
      
      return allRecommendations.filter(rec => 
        rec.status === 'pending' && (rec.senderId === userId || rec.receiverId === userId)
      );
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get recommendations');
    }
  },

  // Subscribe to recommendations for a user (only pending)
  subscribeToRecommendations(
    userId: string, 
    callback: (recommendations: ProfileRecommendation[]) => void
  ) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const recommendationsRef = collection(db, 'profileRecommendations');
    // Simplified query to avoid index issues - get all recommendations and filter client-side
    const q = query(recommendationsRef);

    return onSnapshot(q, (querySnapshot) => {
      const allRecommendations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as ProfileRecommendation[];
      
      const recommendations = allRecommendations.filter(rec => 
        rec.status === 'pending' && (rec.senderId === userId || rec.receiverId === userId)
      );
      callback(recommendations);
    }, (error) => {
      console.error('Firebase subscription error:', error);
    });
  },

  // Delete a recommendation
  async deleteRecommendation(recommendationId: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const recommendationRef = doc(db, 'profileRecommendations', recommendationId);
      await deleteDoc(recommendationRef);
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete recommendation');
    }
  },

};
