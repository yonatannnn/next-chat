import { firestore } from '../config/firebase';

class ChatService {
  // Send message using Firebase Firestore (same as web app)
  async sendMessage(senderId, receiverId, text, fileUrl = null, fileUrls = null, replyTo = null, voiceUrl = null, voiceDuration = null, messageType = 'user', senderName = null, expirationMinutes = null) {
    try {
      // Calculate expiration time if specified
      let expiresAt = null;
      if (expirationMinutes && expirationMinutes > 0) {
        const expirationTime = new Date();
        expirationTime.setMinutes(expirationTime.getMinutes() + expirationMinutes);
        expiresAt = expirationTime;
      }

      const messageData = {
        senderId: messageType === 'system' ? 'system' : senderId,
        receiverId,
        text,
        fileUrl: fileUrl || null,
        fileUrls: fileUrls || null,
        timestamp: firestore.FieldValue.serverTimestamp(),
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
        seen: false,
        edited: false,
        deleted: false,
        isForwarded: false,
      };
      
      const docRef = await firestore.collection('messages').add(messageData);
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Subscribe to messages between two users (same as web app)
  subscribeToMessages(currentUserId, otherUserId, callback) {
    return firestore
      .collection('messages')
      .where('senderId', 'in', [currentUserId, otherUserId])
      .where('receiverId', 'in', [currentUserId, otherUserId])
      .orderBy('timestamp', 'asc')
      .onSnapshot((snapshot) => {
        const messages = snapshot.docs
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
            };
          });
        callback(messages);
      });
  }

  // Subscribe to all incoming messages for notifications
  subscribeToAllIncomingMessages(currentUserId, callback) {
    return firestore
      .collection('messages')
      .where('receiverId', '==', currentUserId)
      .onSnapshot((snapshot) => {
        const messages = snapshot.docs
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
  }

  // Edit message
  async editMessage(messageId, newText) {
    try {
      await firestore.collection('messages').doc(messageId).update({
        text: newText,
        edited: true,
        editedAt: firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Delete message
  async deleteMessage(messageId) {
    try {
      await firestore.collection('messages').doc(messageId).update({
        deleted: true,
        text: 'This message was deleted',
        fileUrl: null,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Mark message as seen
  async markMessageAsSeen(messageId) {
    try {
      await firestore.collection('messages').doc(messageId).update({
        seen: true,
        seenAt: firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Delete all messages between two users
  async deleteAllMessages(userId1, userId2) {
    try {
      // Get all messages between the two users
      const snapshot1 = await firestore
        .collection('messages')
        .where('senderId', '==', userId1)
        .where('receiverId', '==', userId2)
        .get();
      
      const snapshot2 = await firestore
        .collection('messages')
        .where('senderId', '==', userId2)
        .where('receiverId', '==', userId1)
        .get();

      // Collect all message IDs to delete
      const messageIds = [];
      snapshot1.docs.forEach(doc => messageIds.push(doc.id));
      snapshot2.docs.forEach(doc => messageIds.push(doc.id));

      // Delete all messages in batch
      const deletePromises = messageIds.map(messageId => {
        return firestore.collection('messages').doc(messageId).update({
          deleted: true,
          text: 'CONVERSATION_DELETED',
          isSystemMessage: true
        });
      });

      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Forward message
  async forwardMessage(originalMessage, senderId, recipientIds, originalSenderName) {
    try {
      const forwardPromises = recipientIds.map(async (recipientId) => {
        const forwardedMessageData = {
          senderId,
          receiverId: recipientId,
          text: originalMessage.text,
          fileUrl: originalMessage.fileUrl,
          fileUrls: originalMessage.fileUrls,
          timestamp: firestore.FieldValue.serverTimestamp(),
          isForwarded: true,
          originalMessageId: originalMessage.id,
          originalSenderId: originalMessage.senderId,
          originalSenderName: originalSenderName || 'Unknown',
          forwardedBy: senderId,
        };
        
        return firestore.collection('messages').add(forwardedMessageData);
      });

      await Promise.all(forwardPromises);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new ChatService();
