import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '../store/chatStore';

export const chatService = {
  async sendMessage(senderId: string, receiverId: string, text: string, fileUrl?: string, fileUrls?: string[], replyTo?: any) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const messageData = {
        senderId,
        receiverId,
        text,
        fileUrl: fileUrl || null,
        fileUrls: fileUrls || null,
        timestamp: serverTimestamp(),
        replyTo: replyTo ? {
          messageId: replyTo.id,
          text: replyTo.text,
          senderName: replyTo.senderId === senderId ? 'You' : 'Other'
        } : null,
      };
      
      await addDoc(collection(db, 'messages'), messageData);
    } catch (error: unknown) {
      // Handle Firebase quota errors gracefully
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  subscribeToMessages(currentUserId: string, otherUserId: string, callback: (messages: Message[]) => void) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('senderId', 'in', [currentUserId, otherUserId]),
      where('receiverId', 'in', [currentUserId, otherUserId]),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          text: data.text,
          fileUrl: data.fileUrl,
          fileUrls: data.fileUrls,
          timestamp: data.timestamp?.toDate() || new Date(),
          edited: data.edited || false,
          editedAt: data.editedAt?.toDate(),
          deleted: data.deleted || false,
          replyTo: data.replyTo || null,
          isForwarded: data.isForwarded || false,
          originalSenderId: data.originalSenderId || null,
          originalSenderName: data.originalSenderName || null,
          forwardedBy: data.forwardedBy || null,
        };
      });
      callback(messages);
    });
  },

  subscribeToAllIncomingMessages(currentUserId: string, callback: (messages: Message[]) => void) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    const messagesRef = collection(db, 'messages');
    // Simple query without orderBy to avoid index requirement
    const q = query(
      messagesRef,
      where('receiverId', '==', currentUserId)
    );

    return onSnapshot(q, (snapshot) => {
      const messages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          text: data.text,
          fileUrl: data.fileUrl,
          fileUrls: data.fileUrls,
          timestamp: data.timestamp?.toDate() || new Date(),
          edited: data.edited || false,
          editedAt: data.editedAt?.toDate(),
          deleted: data.deleted || false,
          replyTo: data.replyTo || null,
          isForwarded: data.isForwarded || false,
          originalSenderId: data.originalSenderId || null,
          originalSenderName: data.originalSenderName || null,
          forwardedBy: data.forwardedBy || null,
        };
      });
      
      // Return all messages, let the notification hook handle filtering
      callback(messages);
    });
  },

  async editMessage(messageId: string, newText: string) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        text: newText,
        edited: true,
        editedAt: serverTimestamp(),
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async deleteMessage(messageId: string) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        deleted: true,
        text: 'This message was deleted',
        fileUrl: null,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async deleteAllMessages(userId1: string, userId2: string) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      // Get all messages between the two users
      const messagesRef = collection(db, 'messages');
      const q1 = query(
        messagesRef,
        where('senderId', '==', userId1),
        where('receiverId', '==', userId2)
      );
      const q2 = query(
        messagesRef,
        where('senderId', '==', userId2),
        where('receiverId', '==', userId1)
      );

      // Execute both queries
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);

      // Collect all message IDs to delete
      const messageIds: string[] = [];
      snapshot1.docs.forEach(doc => messageIds.push(doc.id));
      snapshot2.docs.forEach(doc => messageIds.push(doc.id));

      // Delete all messages in batch
      const deletePromises = messageIds.map(messageId => {
        const messageRef = doc(db!, 'messages', messageId);
        return deleteDoc(messageRef);
      });

      await Promise.all(deletePromises);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async forwardMessage(originalMessage: Message, senderId: string, recipientIds: string[], originalSenderName?: string) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      // Create forwarded messages for each recipient
      const forwardPromises = recipientIds.map(async (recipientId) => {
        const forwardedMessageData = {
          senderId,
          receiverId: recipientId,
          text: originalMessage.text, // Keep original text without "Forwarded:" prefix
          fileUrl: originalMessage.fileUrl,
          fileUrls: originalMessage.fileUrls,
          timestamp: serverTimestamp(),
          isForwarded: true,
          originalMessageId: originalMessage.id,
          originalSenderId: originalMessage.senderId,
          originalSenderName: originalSenderName || 'Unknown',
          forwardedBy: senderId,
        };
        
        return addDoc(collection(db!, 'messages'), forwardedMessageData);
      });

      await Promise.all(forwardPromises);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },
};
