import { useEffect, useRef, useState, useCallback } from 'react';
import { typingService } from '@/services/typingService';

/**
 * Hook to manage typing indicator for 1-to-1 chats.
 *
 * Returns:
 * - `isOtherUserTyping`: whether the other user is currently typing
 * - `handleTyping`: call this on every keystroke in the message input
 */
export const useTypingIndicator = (
  currentUserId: string | undefined,
  otherUserId: string | null
) => {
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef(0);

  // Subscribe to the other user's typing state
  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      setIsOtherUserTyping(false);
      return;
    }

    const unsubscribe = typingService.subscribeToTyping(
      currentUserId,
      otherUserId,
      setIsOtherUserTyping
    );

    return () => {
      unsubscribe();
      setIsOtherUserTyping(false);
    };
  }, [currentUserId, otherUserId]);

  // Send typing signal, debounced to max once per 2 seconds
  const handleTyping = useCallback(() => {
    if (!currentUserId || !otherUserId) return;

    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;

    typingService.setTyping(currentUserId, otherUserId);

    // Auto-clear typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingService.clearTyping(currentUserId, otherUserId);
    }, 3000);
  }, [currentUserId, otherUserId]);

  // Clear typing on unmount or chat switch
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (currentUserId && otherUserId) {
        typingService.clearTyping(currentUserId, otherUserId);
      }
    };
  }, [currentUserId, otherUserId]);

  // Clear typing when message is sent (call this after send)
  const clearTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (currentUserId && otherUserId) {
      typingService.clearTyping(currentUserId, otherUserId);
    }
    lastTypingSentRef.current = 0;
  }, [currentUserId, otherUserId]);

  return { isOtherUserTyping, handleTyping, clearTyping };
};
