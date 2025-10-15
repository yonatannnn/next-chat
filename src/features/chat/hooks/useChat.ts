import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { chatService } from '../services/chatService';

export const useChat = (currentUserId: string, selectedUserId: string | null) => {
  const { 
    messages, 
    setMessages, 
    updateMessage,
    deleteMessage,
    setLoading, 
    setError 
  } = useChatStore();
  
  const lastEditTime = useRef<number>(0);
  const lastDeleteTime = useRef<number>(0);
  const RATE_LIMIT_MS = 2000; // 2 seconds between operations

  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const unsubscribe = chatService.subscribeToMessages(
      currentUserId,
      selectedUserId,
      (newMessages) => {
        setMessages(newMessages);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserId, selectedUserId, setMessages, setLoading]);

  const sendMessage = async (text: string, fileUrl?: string, fileUrls?: string[]) => {
    if (!selectedUserId) return;
    
    try {
      await chatService.sendMessage(currentUserId, selectedUserId, text, fileUrl, fileUrls);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    const now = Date.now();
    if (now - lastEditTime.current < RATE_LIMIT_MS) {
      setError('Please wait before editing another message');
      return;
    }
    lastEditTime.current = now;

    // Optimistic update first to reduce perceived latency
    updateMessage(messageId, { 
      text: newText, 
      edited: true, 
      editedAt: new Date() 
    });
    
    setLoading(true);
    setError(null);
    try {
      await chatService.editMessage(messageId, newText);
    } catch (error: unknown) {
      // Revert optimistic update on error
      const originalMessage = messages.find(m => m.id === messageId);
      if (originalMessage) {
        updateMessage(messageId, { 
          text: originalMessage.text, 
          edited: originalMessage.edited, 
          editedAt: originalMessage.editedAt 
        });
      }
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const now = Date.now();
    if (now - lastDeleteTime.current < RATE_LIMIT_MS) {
      setError('Please wait before deleting another message');
      return;
    }
    lastDeleteTime.current = now;

    // Optimistic update first
    deleteMessage(messageId);
    
    setLoading(true);
    setError(null);
    try {
      await chatService.deleteMessage(messageId);
    } catch (error: unknown) {
      // Revert optimistic update on error
      const originalMessage = messages.find(m => m.id === messageId);
      if (originalMessage) {
        updateMessage(messageId, { 
          text: originalMessage.text, 
          edited: originalMessage.edited, 
          editedAt: originalMessage.editedAt,
          deleted: false
        });
      }
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    sendMessage,
    editMessage,
    deleteMessage: handleDeleteMessage,
  };
};
