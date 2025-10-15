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

export const simpleConversationService = {
  subscribeToConversations(currentUserId: string, callback: (conversations: Conversation[]) => void) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    const messagesRef = collection(db, 'messages');
    
    // Get all messages where current user is either sender OR receiver
    const allMessagesQuery = query(
      messagesRef,
      where('senderId', '==', currentUserId)
    );

    // Also get messages where current user is receiver
    const receivedMessagesQuery = query(
      messagesRef,
      where('receiverId', '==', currentUserId)
    );

    let sentUnsubscribe: (() => void) | null = null;
    let receivedUnsubscribe: (() => void) | null = null;
    let sentMessages: any[] = [];
    let receivedMessages: any[] = [];

    const processConversations = () => {
      const conversationsMap = new Map<string, Conversation>();
      const allUserIds = new Set<string>();
      
      // Add users from sent messages
      sentMessages.forEach(doc => {
        const data = doc.data();
        if (data.receiverId !== currentUserId) {
          allUserIds.add(data.receiverId);
        }
      });
      
      // Add users from received messages
      receivedMessages.forEach(doc => {
        const data = doc.data();
        if (data.senderId !== currentUserId) {
          allUserIds.add(data.senderId);
        }
      });

      // For each user, get user info and create conversation
      allUserIds.forEach(userId => {
        try {
          // Get user info directly by ID
          getDoc(doc(db!, 'users', userId)).then(userDoc => {
            if (userDoc.exists()) {
              const userData = userDoc.data();
              
              // Find the latest message between current user and this user
              const allMessages = [...sentMessages, ...receivedMessages];
              const conversationMessages = allMessages.filter(msg => {
                const data = msg.data();
                return (data.senderId === currentUserId && data.receiverId === userId) ||
                       (data.senderId === userId && data.receiverId === currentUserId);
              });
              
              // Sort by timestamp to get the latest message
              conversationMessages.sort((a, b) => {
                const timeA = a.data().timestamp?.toDate()?.getTime() || 0;
                const timeB = b.data().timestamp?.toDate()?.getTime() || 0;
                return timeB - timeA;
              });
              
              const latestMessage = conversationMessages[0];
              const lastMessageTime = latestMessage?.data().timestamp?.toDate() || new Date();
              const lastMessageText = latestMessage?.data().text || '';
              
              // Count unread messages (messages sent to current user)
              const unreadCount = receivedMessages.filter(msg => {
                const data = msg.data();
                return data.senderId === userId && data.receiverId === currentUserId;
              }).length;
              
              const conversation: Conversation = {
                id: userId,
                userId: userId,
                username: userData.username,
                email: userData.email,
                avatar: userData.avatar,
                lastMessage: lastMessageText,
                lastMessageTime: lastMessageTime,
                unreadCount: unreadCount,
                isOnline: true
              };
              
              conversationsMap.set(userId, conversation);
              
              // Convert map to array and sort by last message time
              const conversations = Array.from(conversationsMap.values())
                .sort((a, b) => {
                  const timeA = a.lastMessageTime?.getTime() || 0;
                  const timeB = b.lastMessageTime?.getTime() || 0;
                  return timeB - timeA;
                });
              
              callback(conversations);
            }
          });
        } catch (error) {
          console.error('Error fetching user data for:', userId, error);
        }
      });
    };

    // Subscribe to sent messages
    sentUnsubscribe = onSnapshot(allMessagesQuery, (snapshot) => {
      sentMessages = snapshot.docs;
      processConversations();
    }, (error) => {
      console.error('Error fetching sent messages:', error);
    });

    // Subscribe to received messages
    receivedUnsubscribe = onSnapshot(receivedMessagesQuery, (snapshot) => {
      receivedMessages = snapshot.docs;
      processConversations();
    }, (error) => {
      console.error('Error fetching received messages:', error);
    });

    // Return cleanup function
    return () => {
      if (sentUnsubscribe) sentUnsubscribe();
      if (receivedUnsubscribe) receivedUnsubscribe();
    };
  },

  async searchUsers(searchQuery: string, currentUserId: string): Promise<Conversation[]> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const usersRef = collection(db, 'users');
      
      // Get all users and filter on client side for better partial matching
      const allUsersQuery = query(usersRef, limit(100)); // Increased limit to get more users
      const snapshot = await getDocs(allUsersQuery);
      
      const allUsers = snapshot.docs.map(doc => {
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
      
      // Filter users based on search query - EXACT MATCHING ONLY
      const filteredUsers = allUsers.filter(user => {
        const query = searchQuery.toLowerCase();
        
        if (searchQuery.startsWith('@')) {
          // Search by username (exact match) - remove @ prefix
          const username = searchQuery.substring(1).toLowerCase();
          return user.username.toLowerCase() === username;
        } else {
          // Search both username and email (exact match)
          return user.email.toLowerCase() === query || 
                 user.username.toLowerCase() === query;
        }
      });
      
      return filteredUsers.slice(0, 10); // Limit to 10 results
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
};
