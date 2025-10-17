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
  limit,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '../store/chatStore';
import { pushNotificationService } from '@/services/pushNotificationService';

export const chatService = {
  async sendMessage(senderId: string, receiverId: string, text: string, fileUrl?: string, fileUrls?: string[], replyTo?: any, voiceUrl?: string, voiceDuration?: number, messageType?: 'system', senderName?: string) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const messageData = {
        senderId: messageType === 'system' ? 'system' : senderId,
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
        voiceUrl: voiceUrl || null,
        voiceDuration: voiceDuration || null,
        messageType: messageType || 'user',
      };
      
      await addDoc(collection(db, 'messages'), messageData);
      
      // Send push notification to receiver (only for user messages, not system messages)
      if (messageType !== 'system') {
        try {
          // Get sender name for notification
          const notificationSenderName = senderName || 'Someone';
          
          // Send push notification in background
          pushNotificationService.sendChatNotification(
            receiverId,
            notificationSenderName,
            text,
            senderId
          ).catch(error => {
            console.error('Failed to send push notification:', error);
            // Don't throw error here as message was already sent successfully
          });
        } catch (pushError) {
          console.error('Error sending push notification:', pushError);
          // Don't throw error here as message was already sent successfully
        }
      }
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
      const messages: Message[] = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          // Filter out CONVERSATION_DELETED system messages
          return !(data.text === 'CONVERSATION_DELETED' && data.isSystemMessage);
        })
        .map(doc => {
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
            voiceUrl: data.voiceUrl || null,
            voiceDuration: data.voiceDuration || null,
            seen: data.seen || false,
            seenAt: data.seenAt?.toDate(),
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
      const messages: Message[] = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          // Filter out CONVERSATION_DELETED system messages
          return !(data.text === 'CONVERSATION_DELETED' && data.isSystemMessage);
        })
        .map(doc => {
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
            voiceUrl: data.voiceUrl || null,
            voiceDuration: data.voiceDuration || null,
            seen: data.seen || false,
            seenAt: data.seenAt?.toDate(),
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

  async markMessageAsSeen(messageId: string) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        seen: true,
        seenAt: serverTimestamp(),
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

      // Add a special "deleted" message to mark the conversation as deleted
      // This ensures the conversation disappears from both users' chat lists
      const deletedMessageRef = doc(collection(db!, 'messages'));
      await setDoc(deletedMessageRef, {
        senderId: userId1,
        receiverId: userId2,
        text: 'CONVERSATION_DELETED',
        timestamp: serverTimestamp(),
        deleted: true,
        isSystemMessage: true
      });

      // Also add the reverse message for the other user
      const deletedMessageRef2 = doc(collection(db!, 'messages'));
      await setDoc(deletedMessageRef2, {
        senderId: userId2,
        receiverId: userId1,
        text: 'CONVERSATION_DELETED',
        timestamp: serverTimestamp(),
        deleted: true,
        isSystemMessage: true
      });

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

  async uploadVoiceMessage(audioBlob: Blob): Promise<{ url: string; duration: number }> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      // Create a unique filename for the voice message
      const fileName = `voice-${Date.now()}.webm`;
      const filePath = `voice-messages/${fileName}`;

      // Upload to Firebase Storage (you'll need to import storage functions)
      // For now, we'll create a data URL as a placeholder
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = () => {
          const dataUrl = reader.result as string;
          
          // Get audio duration
          const audio = new Audio(dataUrl);
          audio.onloadedmetadata = () => {
            resolve({
              url: dataUrl,
              duration: audio.duration
            });
          };
          audio.onerror = () => {
            reject(new Error('Failed to load audio'));
          };
        };
        reader.onerror = () => {
          reject(new Error('Failed to read audio file'));
        };
        reader.readAsDataURL(audioBlob);
      });
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },
};
