import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocs,
  limit,
  getDoc,
  doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Conversation } from '../store/chatStore';

export const conversationService = {
  subscribeToConversations(currentUserId: string, callback: (conversations: Conversation[]) => void) {
    const messagesRef = collection(db, 'messages');
    
    // Get all messages where current user is either sender or receiver
    const q = query(
      messagesRef,
      where('senderId', '==', currentUserId)
    );

    return onSnapshot(q, async (snapshot) => {
      const conversationsMap = new Map<string, Conversation>();
      
      // Get all unique user IDs that the current user has messaged
      const userIds = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.receiverId !== currentUserId) {
          userIds.add(data.receiverId);
        }
      });

      // For each user, get the latest message and unread count
      for (const userId of userIds) {
        try {
          // Get user info directly by ID
          const userDoc = await getDoc(doc(db, 'users', userId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Get the latest message between current user and this user
            const conversationQuery = query(
              messagesRef,
              where('senderId', 'in', [currentUserId, userId]),
              where('receiverId', 'in', [currentUserId, userId]),
              orderBy('timestamp', 'desc'),
              limit(1)
            );
            
            const conversationSnapshot = await getDocs(conversationQuery);
            const latestMessage = conversationSnapshot.empty ? null : conversationSnapshot.docs[0].data();
            
            // Count unread messages (messages sent to current user that they haven't read)
            const unreadQuery = query(
              messagesRef,
              where('senderId', '==', userId),
              where('receiverId', '==', currentUserId)
            );
            
            const unreadSnapshot = await getDocs(unreadQuery);
            const unreadCount = unreadSnapshot.size;
            
            const conversation: Conversation = {
              id: userId,
              userId: userId,
              username: userData.username,
              email: userData.email,
              avatar: userData.avatar,
              lastMessage: latestMessage?.text || '',
              lastMessageTime: latestMessage?.timestamp?.toDate() || new Date(),
              unreadCount,
              isOnline: true // You can implement real online status later
            };
            
            conversationsMap.set(userId, conversation);
          }
        } catch (error) {
          console.error('Error fetching conversation data for user:', userId, error);
        }
      }
      
      // Convert map to array and sort by last message time
      const conversations = Array.from(conversationsMap.values())
        .sort((a, b) => {
          const timeA = a.lastMessageTime?.getTime() || 0;
          const timeB = b.lastMessageTime?.getTime() || 0;
          return timeB - timeA; // Most recent first
        });
      
      callback(conversations);
    }, (error) => {
      console.error('Error fetching conversations:', error);
      callback([]);
    });
  },

  async searchUsers(searchQuery: string, currentUserId: string): Promise<Conversation[]> {
    try {
      const usersRef = collection(db, 'users');
      let firestoreQuery;
      
      if (searchQuery.startsWith('@')) {
        // Search by username
        const username = searchQuery.substring(1);
        firestoreQuery = query(
          usersRef,
          where('username', '>=', username),
          where('username', '<=', username + '\uf8ff'),
          limit(10)
        );
      } else {
        // Search by email
        firestoreQuery = query(
          usersRef,
          where('email', '>=', searchQuery),
          where('email', '<=', searchQuery + '\uf8ff'),
          limit(10)
        );
      }
      
      const snapshot = await getDocs(firestoreQuery);
      const users: Conversation[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          userId: data.id,
          username: data.username,
          email: data.email,
          avatar: data.avatar,
          lastMessage: '',
          lastMessageTime: new Date(),
          unreadCount: 0,
          isOnline: true
        };
      }).filter(user => user.userId !== currentUserId);
      
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
};
