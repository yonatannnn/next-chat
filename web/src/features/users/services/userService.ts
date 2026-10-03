import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '../store/usersStore';

export const userService = {
  subscribeToUsers(currentUserId: string, callback: (users: User[]) => void) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('id', '!=', currentUserId));

    return onSnapshot(q, (snapshot) => {
      const users: User[] = snapshot.docs.map(doc => {
        const data = doc.data();
        
        const user = {
          id: data.id,
          username: data.username,
          email: data.email,
          avatar: data.avatar,
        };
        return user;
      });
      callback(users);
    }, (error) => {
      // Handle Firebase quota errors gracefully
      if (error.message.includes('resource-exhausted')) {
        console.warn('Firebase quota exceeded. Users list may not update in real-time.');
        callback([]); // Return empty array as fallback
      } else {
        console.error('Error fetching users:', error);
        callback([]);
      }
    });
  },
};