import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export class MessageExpirationService {
  private static instance: MessageExpirationService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): MessageExpirationService {
    if (!MessageExpirationService.instance) {
      MessageExpirationService.instance = new MessageExpirationService();
    }
    return MessageExpirationService.instance;
  }

  /**
   * Start the background cleanup service
   * Runs every 5 minutes to check for expired messages
   */
  public startCleanupService(): void {
    if (this.isRunning) {
      console.log('Message expiration service is already running');
      return;
    }

    console.log('Starting message expiration cleanup service...');
    this.isRunning = true;

    // Run cleanup immediately
    this.cleanupExpiredMessages();

    // Then run every 1 minute for testing (change back to 5 minutes in production)
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredMessages();
    }, 1 * 60 * 1000); // 1 minute for testing
  }

  /**
   * Stop the background cleanup service
   */
  public stopCleanupService(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('Message expiration service stopped');
  }

  /**
   * Clean up expired messages from the database
   */
  private async cleanupExpiredMessages(): Promise<void> {
    if (!db) {
      console.error('Firebase not initialized');
      return;
    }

    try {
      const now = new Date();
      console.log(`🔍 Checking for expired messages at ${now.toISOString()}`);

      // Query for regular messages that have expired
      const messagesRef = collection(db, 'messages');
      const expiredQuery = query(
        messagesRef,
        where('expiresAt', '<=', now),
        where('isExpired', '==', false)
      );

      // Query for group messages that have expired
      const groupMessagesRef = collection(db, 'groupMessages');
      const expiredGroupQuery = query(
        groupMessagesRef,
        where('expiresAt', '<=', now),
        where('isExpired', '==', false)
      );

      const [messagesSnapshot, groupMessagesSnapshot] = await Promise.all([
        getDocs(expiredQuery),
        getDocs(expiredGroupQuery)
      ]);

      const expiredMessages = messagesSnapshot.docs;
      const expiredGroupMessages = groupMessagesSnapshot.docs;
      const totalExpired = expiredMessages.length + expiredGroupMessages.length;

      console.log(`📊 Query results: ${expiredMessages.length} regular messages, ${expiredGroupMessages.length} group messages`);

      // Debug: Log some message details
      if (expiredMessages.length > 0) {
        console.log('📝 Sample expired regular messages:');
        expiredMessages.slice(0, 3).forEach((doc, index) => {
          const data = doc.data();
          console.log(`  ${index + 1}. ID: ${doc.id}, expiresAt: ${data.expiresAt?.toDate()}, text: ${data.text?.substring(0, 50)}...`);
        });
      }

      if (expiredGroupMessages.length > 0) {
        console.log('📝 Sample expired group messages:');
        expiredGroupMessages.slice(0, 3).forEach((doc, index) => {
          const data = doc.data();
          console.log(`  ${index + 1}. ID: ${doc.id}, expiresAt: ${data.expiresAt?.toDate()}, text: ${data.text?.substring(0, 50)}...`);
        });
      }

      if (totalExpired === 0) {
        console.log('✅ No expired messages found');
        return;
      }

      console.log(`🗑️ Found ${totalExpired} expired messages to clean up (${expiredMessages.length} regular, ${expiredGroupMessages.length} group)`);

      // Process expired regular messages
      const deletePromises = expiredMessages.map(async (messageDoc) => {
        const messageData = messageDoc.data();
        
        try {
          console.log(`🔄 Processing expired message ${messageDoc.id}: "${messageData.text?.substring(0, 30)}..."`);
          
          // For files, we might want to keep the message but mark as expired
          // and delete the actual file from storage
          if (messageData.fileUrl || messageData.fileUrls) {
            // Mark as expired instead of deleting
            await updateDoc(doc(db, 'messages', messageDoc.id), {
              isExpired: true,
              text: 'This message has expired',
              fileUrl: null,
              fileUrls: null,
              voiceUrl: null,
              expiresAt: serverTimestamp(),
            });
            console.log(`✅ Marked message ${messageDoc.id} as expired (had files)`);
          } else {
            // For text-only messages, delete completely
            await deleteDoc(doc(db, 'messages', messageDoc.id));
            console.log(`✅ Deleted expired message ${messageDoc.id}`);
          }
        } catch (error) {
          console.error(`❌ Error processing expired message ${messageDoc.id}:`, error);
        }
      });

      // Process expired group messages
      const deleteGroupPromises = expiredGroupMessages.map(async (messageDoc) => {
        const messageData = messageDoc.data();
        
        try {
          console.log(`🔄 Processing expired group message ${messageDoc.id}: "${messageData.text?.substring(0, 30)}..."`);
          
          // For files, we might want to keep the message but mark as expired
          // and delete the actual file from storage
          if (messageData.fileUrl || messageData.fileUrls) {
            // Mark as expired instead of deleting
            await updateDoc(doc(db, 'groupMessages', messageDoc.id), {
              isExpired: true,
              text: 'This message has expired',
              fileUrl: null,
              fileUrls: null,
              voiceUrl: null,
              expiresAt: serverTimestamp(),
            });
            console.log(`✅ Marked group message ${messageDoc.id} as expired (had files)`);
          } else {
            // For text-only messages, delete completely
            await deleteDoc(doc(db, 'groupMessages', messageDoc.id));
            console.log(`✅ Deleted expired group message ${messageDoc.id}`);
          }
        } catch (error) {
          console.error(`❌ Error processing expired group message ${messageDoc.id}:`, error);
        }
      });

      await Promise.all([...deletePromises, ...deleteGroupPromises]);
      console.log(`Successfully processed ${totalExpired} expired messages`);

    } catch (error) {
      console.error('Error during message expiration cleanup:', error);
    }
  }

  /**
   * Clean up expired files from storage
   * Files are automatically deleted after 2 days by default
   */
  public async cleanupExpiredFiles(): Promise<void> {
    if (!db) {
      console.error('Firebase not initialized');
      return;
    }

    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      console.log(`Checking for files older than ${twoDaysAgo.toISOString()}`);

      // Query for messages with files older than 2 days
      const messagesRef = collection(db, 'messages');
      const fileQuery = query(
        messagesRef,
        where('timestamp', '<=', twoDaysAgo),
        where('fileUrl', '!=', null)
      );

      const snapshot = await getDocs(fileQuery);
      const oldFileMessages = snapshot.docs;

      if (oldFileMessages.length === 0) {
        console.log('No old files found');
        return;
      }

      console.log(`Found ${oldFileMessages.length} messages with old files to clean up`);

      // Process old file messages
      const updatePromises = oldFileMessages.map(async (messageDoc) => {
        try {
          await updateDoc(doc(db, 'messages', messageDoc.id), {
            fileUrl: null,
            fileUrls: null,
            text: messageDoc.data().text + ' [File expired after 2 days]',
          });
          console.log(`Cleaned up old files from message ${messageDoc.id}`);
        } catch (error) {
          console.error(`Error cleaning up files from message ${messageDoc.id}:`, error);
        }
      });

      await Promise.all(updatePromises);
      console.log(`Successfully cleaned up ${oldFileMessages.length} old file messages`);

    } catch (error) {
      console.error('Error during file cleanup:', error);
    }
  }

  /**
   * Manually trigger cleanup (for testing)
   */
  public async triggerCleanup(): Promise<void> {
    console.log('🧪 Manual cleanup triggered');
    await this.cleanupExpiredMessages();
  }

  /**
   * Debug function to check messages with expiration
   */
  public async debugExpirationMessages(): Promise<void> {
    if (!db) {
      console.error('Firebase not initialized');
      return;
    }

    try {
      console.log('🔍 Debug: Checking all messages with expiration...');
      
      // Check regular messages with expiration
      const messagesRef = collection(db, 'messages');
      const messagesWithExpirationQuery = query(
        messagesRef,
        where('expirationMinutes', '!=', null)
      );
      
      const groupMessagesRef = collection(db, 'groupMessages');
      const groupMessagesWithExpirationQuery = query(
        groupMessagesRef,
        where('expirationMinutes', '!=', null)
      );

      const [messagesSnapshot, groupMessagesSnapshot] = await Promise.all([
        getDocs(messagesWithExpirationQuery),
        getDocs(groupMessagesWithExpirationQuery)
      ]);

      console.log(`📊 Found ${messagesSnapshot.docs.length} regular messages with expiration`);
      console.log(`📊 Found ${groupMessagesSnapshot.docs.length} group messages with expiration`);

      // Log some examples
      messagesSnapshot.docs.slice(0, 5).forEach((doc, index) => {
        const data = doc.data();
        console.log(`📝 Regular message ${index + 1}: ID=${doc.id}, expirationMinutes=${data.expirationMinutes}, expiresAt=${data.expiresAt?.toDate()}, text="${data.text?.substring(0, 30)}..."`);
      });

      groupMessagesSnapshot.docs.slice(0, 5).forEach((doc, index) => {
        const data = doc.data();
        console.log(`📝 Group message ${index + 1}: ID=${doc.id}, expirationMinutes=${data.expirationMinutes}, expiresAt=${data.expiresAt?.toDate()}, text="${data.text?.substring(0, 30)}..."`);
      });

    } catch (error) {
      console.error('Error debugging expiration messages:', error);
    }
  }

  /**
   * Get statistics about message expiration
   */
  public async getExpirationStats(): Promise<{
    totalMessages: number;
    expiredMessages: number;
    messagesWithExpiration: number;
  }> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const messagesRef = collection(db, 'messages');
      
      // Get total messages
      const totalSnapshot = await getDocs(messagesRef);
      const totalMessages = totalSnapshot.size;

      // Get expired messages
      const expiredQuery = query(messagesRef, where('isExpired', '==', true));
      const expiredSnapshot = await getDocs(expiredQuery);
      const expiredMessages = expiredSnapshot.size;

      // Get messages with expiration set
      const expirationQuery = query(messagesRef, where('expirationMinutes', '!=', null));
      const expirationSnapshot = await getDocs(expirationQuery);
      const messagesWithExpiration = expirationSnapshot.size;

      return {
        totalMessages,
        expiredMessages,
        messagesWithExpiration,
      };
    } catch (error) {
      console.error('Error getting expiration stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const messageExpirationService = MessageExpirationService.getInstance();
