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

export const improvedConversationService = {
  subscribeToConversations(currentUserId: string, callback: (conversations: Conversation[]) => void) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    const messagesRef = collection(db, 'messages');
    
    // Get all messages where current user is involved (either sender or receiver)
    const sentMessagesQuery = query(
      messagesRef,
      where('senderId', '==', currentUserId)
    );

    const receivedMessagesQuery = query(
      messagesRef,
      where('receiverId', '==', currentUserId)
    );

    let sentUnsubscribe: (() => void) | null = null;
    let receivedUnsubscribe: (() => void) | null = null;
    let allMessages: any[] = [];

    const processConversations = async () => {
      const conversationsMap = new Map<string, Conversation>();
      const userIds = new Set<string>();
      
      // Collect all user IDs from messages
      allMessages.forEach(doc => {
        const data = doc.data();
        if (data.senderId === currentUserId && data.receiverId !== currentUserId) {
          userIds.add(data.receiverId);
        } else if (data.receiverId === currentUserId && data.senderId !== currentUserId) {
          userIds.add(data.senderId);
        }
      });

      // Process each conversation
      for (const userId of userIds) {
        try {
          const userDoc = await getDoc(doc(db!, 'users', userId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Get all messages between current user and this user
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
            const lastMessageData = latestMessage?.data();
            const lastMessageText = lastMessageData?.text || '';
            const lastMessageSenderId = lastMessageData?.senderId;
            
            // Count unread messages (messages sent TO current user)
            const unreadCount = conversationMessages.filter(msg => {
              const data = msg.data();
              return data.senderId === userId && data.receiverId === currentUserId;
            }).length;
            
            // Check if the last message was sent TO the current user (making it bold)
            const isLastMessageToMe = lastMessageData?.receiverId === currentUserId;
            
            // Format the last message to show who sent it
            let formattedLastMessage = '';
            let previewText = '';
            
            // Determine preview text based on message type
            if (lastMessageText) {
              previewText = lastMessageText;
            } else if (lastMessageData?.fileUrl) {
              previewText = '📷 Photo';
            } else if (lastMessageData?.fileUrls && lastMessageData.fileUrls.length > 0) {
              previewText = `📷 ${lastMessageData.fileUrls.length} photos`;
            } else if (lastMessageData?.voiceUrl) {
              previewText = '🎤 Voice message';
            } else {
              previewText = 'Message';
            }
            
            if (previewText) {
              if (lastMessageSenderId === currentUserId) {
                formattedLastMessage = `Me: ${previewText}`;
              } else {
                formattedLastMessage = `${userData.username}: ${previewText}`;
              }
            }
            
            const conversation: Conversation = {
              id: userId,
              userId: userId,
              username: userData.username,
              email: userData.email,
              avatar: userData.avatar,
              lastMessage: formattedLastMessage,
              lastMessageTime: lastMessageTime,
              unreadCount: isLastMessageToMe ? 1 : 0, // Use 1 for bold, 0 for normal
              isOnline: true
            };
            
            conversationsMap.set(userId, conversation);
          }
        } catch (error) {
          console.error('Error fetching user data for:', userId, error);
        }
      }
      
      // Convert map to array and sort by last message time
      const conversations = Array.from(conversationsMap.values())
        .sort((a, b) => {
          const timeA = a.lastMessageTime?.getTime() || 0;
          const timeB = b.lastMessageTime?.getTime() || 0;
          return timeB - timeA;
        });
      
      callback(conversations);
    };

    // Subscribe to sent messages
    sentUnsubscribe = onSnapshot(sentMessagesQuery, (snapshot) => {
      const sentMessages = snapshot.docs;
      allMessages = [...allMessages.filter(msg => msg.data().receiverId === currentUserId), ...sentMessages];
      processConversations();
    }, (error) => {
      console.error('Error fetching sent messages:', error);
    });

    // Subscribe to received messages
    receivedUnsubscribe = onSnapshot(receivedMessagesQuery, (snapshot) => {
      const receivedMessages = snapshot.docs;
      allMessages = [...allMessages.filter(msg => msg.data().senderId === currentUserId), ...receivedMessages];
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
