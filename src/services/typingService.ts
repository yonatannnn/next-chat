import { doc, setDoc, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getConversationId } from '@/features/chat/services/chatUtils';

export const typingService = {
  /**
   * Set the current user as typing in a conversation.
   * The document includes a timestamp so listeners can detect stale typing state.
   */
  setTyping(currentUserId: string, otherUserId: string) {
    if (!db) return;
    const conversationId = getConversationId(currentUserId, otherUserId);
    const typingRef = doc(db, 'typing', `${conversationId}_${currentUserId}`);
    setDoc(typingRef, {
      userId: currentUserId,
      conversationId,
      timestamp: serverTimestamp(),
    }).catch(() => {
      // Silently ignore write errors for typing indicators
    });
  },

  /**
   * Clear the typing indicator for the current user.
   */
  clearTyping(currentUserId: string, otherUserId: string) {
    if (!db) return;
    const conversationId = getConversationId(currentUserId, otherUserId);
    const typingRef = doc(db, 'typing', `${conversationId}_${currentUserId}`);
    deleteDoc(typingRef).catch(() => {
      // Silently ignore delete errors
    });
  },

  /**
   * Subscribe to the other user's typing state in a 1-to-1 conversation.
   * Returns an unsubscribe function.
   */
  subscribeToTyping(
    currentUserId: string,
    otherUserId: string,
    callback: (isTyping: boolean) => void
  ): () => void {
    if (!db) return () => {};
    const conversationId = getConversationId(currentUserId, otherUserId);
    const typingRef = doc(db, 'typing', `${conversationId}_${otherUserId}`);

    let staleTimer: NodeJS.Timeout | null = null;

    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      if (staleTimer) clearTimeout(staleTimer);

      if (snapshot.exists()) {
        const data = snapshot.data();
        const ts = data.timestamp?.toDate?.();
        // Consider typing stale if older than 4 seconds
        if (ts && Date.now() - ts.getTime() < 4000) {
          callback(true);
          // Auto-clear after 4 seconds if no update
          staleTimer = setTimeout(() => callback(false), 4000);
          return;
        }
      }
      callback(false);
    });

    return () => {
      if (staleTimer) clearTimeout(staleTimer);
      unsubscribe();
    };
  },

  /**
   * Set typing for a group conversation.
   */
  setGroupTyping(currentUserId: string, groupId: string) {
    if (!db) return;
    const typingRef = doc(db, 'typing', `group_${groupId}_${currentUserId}`);
    setDoc(typingRef, {
      userId: currentUserId,
      groupId,
      timestamp: serverTimestamp(),
    }).catch(() => {});
  },

  clearGroupTyping(currentUserId: string, groupId: string) {
    if (!db) return;
    const typingRef = doc(db, 'typing', `group_${groupId}_${currentUserId}`);
    deleteDoc(typingRef).catch(() => {});
  },
};
