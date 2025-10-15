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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '../store/chatStore';

export const chatService = {
  async sendMessage(senderId: string, receiverId: string, text: string, fileUrl?: string, fileUrls?: string[]) {
    try {
      const messageData = {
        senderId,
        receiverId,
        text,
        fileUrl: fileUrl || null,
        fileUrls: fileUrls || null,
        timestamp: serverTimestamp(),
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
        };
      });
      callback(messages);
    });
  },

  async editMessage(messageId: string, newText: string) {
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
};
