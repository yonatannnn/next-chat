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
  writeBatch,
  increment,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  Query,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '../store/chatStore';
import { pushNotificationService } from '@/services/pushNotificationService';
import { buildMessagePreview, getConversationId } from './chatUtils';

export const chatService = {
  async sendMessage(
    senderId: string,
    receiverId: string,
    text: string,
    fileUrl?: string,
    fileUrls?: string[],
    replyTo?: any,
    voiceUrl?: string,
    voiceDuration?: number,
    messageType?: 'system' | 'user',
    senderName?: string,
    expirationMinutes?: number | null,
    senderProfile?: { username?: string; email?: string; avatar?: string },
    receiverProfile?: { username?: string; email?: string; avatar?: string },
    clientId?: string
  ) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      // Calculate expiration time if specified
      let expiresAt = null;
      if (expirationMinutes && expirationMinutes > 0) {
        const expirationTime = new Date();
        expirationTime.setMinutes(expirationTime.getMinutes() + expirationMinutes);
        expiresAt = expirationTime;
      }

      const conversationId = getConversationId(senderId, receiverId);
      const messageData = {
        senderId: messageType === 'system' ? 'system' : senderId,
        receiverId,
        text,
        fileUrl: fileUrl || null,
        fileUrls: fileUrls || null,
        timestamp: serverTimestamp(),
        conversationId,
        participants: [senderId, receiverId],
        replyTo: replyTo ? {
          messageId: replyTo.id,
          text: replyTo.text,
          senderName: replyTo.senderId === senderId ? 'You' : 'Other'
        } : null,
        voiceUrl: voiceUrl || null,
        voiceDuration: voiceDuration || null,
        messageType: messageType || 'user',
        expiresAt: expiresAt,
        expirationMinutes: expirationMinutes || null,
        isExpired: false,
        ...(clientId ? { clientId } : {}),
      };
      const batch = writeBatch(db);
      const messageRef = doc(collection(db, 'messages'));
      batch.set(messageRef, messageData);

      const conversationRef = doc(db, 'conversations', conversationId);
      const previewText = buildMessagePreview({
        text,
        fileUrl,
        fileUrls,
        voiceUrl,
        messageType,
      });

      const senderProfileData = {
        username: senderProfile?.username || senderName || 'Someone',
        email: senderProfile?.email || null,
        avatar: senderProfile?.avatar || null,
      };

      const fetchUserProfile = async (userId: string) => {
        try {
          const directDoc = await getDoc(doc(db!, 'users', userId));
          if (directDoc.exists()) {
            const data = directDoc.data() as any;
            return {
              username: data.username,
              email: data.email,
              avatar: data.avatar,
            };
          }
          const fallbackQuery = query(
            collection(db!, 'users'),
            where('id', '==', userId),
            limit(1)
          );
          const fallbackSnap = await getDocs(fallbackQuery);
          if (!fallbackSnap.empty) {
            const data = fallbackSnap.docs[0].data() as any;
            return {
              username: data.username,
              email: data.email,
              avatar: data.avatar,
            };
          }
        } catch (error) {
          console.warn('Failed to fetch user profile:', error);
        }
        return null;
      };

      let resolvedReceiverProfile = receiverProfile;
      if (!resolvedReceiverProfile) {
        resolvedReceiverProfile = (await fetchUserProfile(receiverId)) ?? undefined;
      }

      const receiverProfileData = resolvedReceiverProfile
        ? {
            username: resolvedReceiverProfile.username || 'Unknown',
            email: resolvedReceiverProfile.email || null,
            avatar: resolvedReceiverProfile.avatar || null,
          }
        : null;

      const conversationSnapshot = await getDoc(conversationRef);
      const existingConversation = conversationSnapshot.exists()
        ? (conversationSnapshot.data() as any)
        : null;

      const existingUnreadCounts = existingConversation?.unreadCounts || {};
      const existingLastReadAt = existingConversation?.lastReadAt || {};
      const existingProfiles = existingConversation?.profiles || {};

      const conversationUpdate: Record<string, unknown> = {
        participants: [senderId, receiverId],
        lastMessage: previewText,
        lastMessageAt: serverTimestamp(),
        lastSenderId: senderId,
        updatedAt: serverTimestamp(),
        unreadCounts: {
          ...existingUnreadCounts,
          [senderId]: 0,
          [receiverId]: increment(1),
        },
        lastReadAt: {
          ...existingLastReadAt,
          [senderId]: serverTimestamp(),
        },
        profiles: {
          ...existingProfiles,
          [senderId]: senderProfileData,
          ...(receiverProfileData ? { [receiverId]: receiverProfileData } : {}),
        },
      };

      batch.set(conversationRef, conversationUpdate, { merge: true });

      await batch.commit();
      
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

  subscribeToMessages(
    currentUserId: string,
    otherUserId: string,
    callback: (messages: Message[], cursor: QueryDocumentSnapshot<DocumentData> | null, hasMore: boolean) => void,
    options?: { limit?: number }
  ) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    const messagesRef = collection(db, 'messages');
    const conversationId = getConversationId(currentUserId, otherUserId);
    const pageSize = options?.limit ?? 50;
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      limit(pageSize)
    );

    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs;
      const messages: Message[] = docs
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
            expiresAt: data.expiresAt?.toDate() || null,
            expirationMinutes: data.expirationMinutes || null,
            isExpired: data.isExpired || false,
            clientId: data.clientId || undefined,
          };
        })
        .reverse();
      const cursor = docs.length > 0 ? docs[docs.length - 1] : null;
      const hasMore = docs.length === pageSize;
      callback(messages, cursor, hasMore);
    });
  },

  async loadOlderMessages(
    currentUserId: string,
    otherUserId: string,
    cursor: QueryDocumentSnapshot<DocumentData>,
    pageSize = 50
  ): Promise<{ messages: Message[]; cursor: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const messagesRef = collection(db, 'messages');
    const conversationId = getConversationId(currentUserId, otherUserId);
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      startAfter(cursor),
      limit(pageSize)
    );

    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    const messages: Message[] = docs
      .filter(doc => {
        const data = doc.data();
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
          expiresAt: data.expiresAt?.toDate() || null,
          expirationMinutes: data.expirationMinutes || null,
          isExpired: data.isExpired || false,
        };
      })
      .reverse();

    const nextCursor = docs.length > 0 ? docs[docs.length - 1] : null;
    const hasMore = docs.length === pageSize;
    return { messages, cursor: nextCursor, hasMore };
  },

  subscribeToAllIncomingMessages(currentUserId: string, callback: (messages: Message[]) => void) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('receiverId', '==', currentUserId),
      orderBy('timestamp', 'desc'),
      limit(50)
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

  async markConversationRead(currentUserId: string, otherUserId: string) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const conversationId = getConversationId(currentUserId, otherUserId);
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      [`unreadCounts.${currentUserId}`]: 0,
      [`lastReadAt.${currentUserId}`]: serverTimestamp(),
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
      const conversationId = getConversationId(userId1, userId2);
      const messagesRef = collection(db, 'messages');
      let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
      const pageSize = 400;

      while (true) {
        const q: Query<DocumentData> = lastDoc
          ? query(
              messagesRef,
              where('conversationId', '==', conversationId),
              orderBy('timestamp', 'desc'),
              startAfter(lastDoc),
              limit(pageSize)
            )
          : query(
              messagesRef,
              where('conversationId', '==', conversationId),
              orderBy('timestamp', 'desc'),
              limit(pageSize)
            );

        const snapshot = await getDocs(q);
        if (snapshot.empty) break;

        const batch = writeBatch(db);
        snapshot.docs.forEach((docSnap) => {
          batch.delete(doc(db!, 'messages', docSnap.id));
        });
        await batch.commit();

        lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
        if (snapshot.docs.length < pageSize) break;
      }

      await deleteDoc(doc(db, 'conversations', conversationId));

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
        const conversationId = getConversationId(senderId, recipientId);
        const forwardedMessageData = {
          senderId,
          receiverId: recipientId,
          text: originalMessage.text, // Keep original text without "Forwarded:" prefix
          fileUrl: originalMessage.fileUrl,
          fileUrls: originalMessage.fileUrls,
          timestamp: serverTimestamp(),
          conversationId,
          participants: [senderId, recipientId],
          isForwarded: true,
          originalMessageId: originalMessage.id,
          originalSenderId: originalMessage.senderId,
          originalSenderName: originalSenderName || 'Unknown',
          forwardedBy: senderId,
        };
        
        const batch = writeBatch(db!);
        const messageRef = doc(collection(db!, 'messages'));
        batch.set(messageRef, forwardedMessageData);

        const conversationRef = doc(db!, 'conversations', conversationId);
        const previewText = buildMessagePreview({
          text: originalMessage.text,
          fileUrl: originalMessage.fileUrl || undefined,
          fileUrls: originalMessage.fileUrls || undefined,
          voiceUrl: originalMessage.voiceUrl || undefined,
        });

        batch.set(
          conversationRef,
          {
            participants: [senderId, recipientId],
            lastMessage: previewText,
            lastMessageAt: serverTimestamp(),
            lastSenderId: senderId,
            updatedAt: serverTimestamp(),
            [`unreadCounts.${recipientId}`]: increment(1),
            [`unreadCounts.${senderId}`]: 0,
            [`lastReadAt.${senderId}`]: serverTimestamp(),
          },
          { merge: true }
        );

        await batch.commit();
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
