import { useEffect, useRef, useState } from 'react';
import { useChatStore, Message } from '../store/chatStore';
import { chatService } from '../services/chatService';

type UserProfile = {
  username?: string;
  email?: string;
  avatar?: string;
};

export const useChat = (
  currentUserId: string,
  selectedUserId: string | null,
  senderProfile?: UserProfile
) => {
  const { 
    messages, 
    setMessages, 
    updateMessage,
    deleteMessage,
    deleteAllMessages,
    setLoading, 
    setError,
    conversations
  } = useChatStore();
  
  const lastEditTime = useRef<number>(0);
  const lastDeleteTime = useRef<number>(0);
  const RATE_LIMIT_MS = 2000; // 2 seconds between operations
  const lastCursorRef = useRef<any | null>(null);
  const isLoadingOlderRef = useRef(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const subscriptionIdRef = useRef(0);

  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      return;
    }

    // Clear previous conversation messages immediately to avoid stale UI.
    setMessages([]);
    lastCursorRef.current = null;
    setHasMoreMessages(false);
    setLoading(true);
    const subscriptionId = ++subscriptionIdRef.current;
    const unsubscribe = chatService.subscribeToMessages(
      currentUserId,
      selectedUserId,
      (newMessages, cursor, hasMore) => {
        if (subscriptionIdRef.current !== subscriptionId) {
          return;
        }
        setMessages(newMessages);
        lastCursorRef.current = cursor;
        setHasMoreMessages(hasMore);
        setLoading(false);
      },
      { limit: 50 }
    );

    return () => unsubscribe();
  }, [currentUserId, selectedUserId, setMessages, setLoading]);

  const sendMessage = async (text: string, fileUrl?: string, fileUrls?: string[], replyTo?: any, voiceUrl?: string, voiceDuration?: number, messageType?: 'system', senderName?: string) => {
    if (!selectedUserId) return;
    
    try {
      // Get expiration setting for this conversation
      const conversation = conversations.find(conv => conv.userId === selectedUserId);
      const expirationMinutes = conversation?.expirationMinutes || null;
      const receiverProfile = conversation ? {
        username: conversation.username,
        email: conversation.email,
        avatar: conversation.avatar,
      } : undefined;
      
      console.log(`Sending message to ${selectedUserId} with expiration: ${expirationMinutes} minutes`);
      
      await chatService.sendMessage(
        currentUserId,
        selectedUserId,
        text,
        fileUrl,
        fileUrls,
        replyTo,
        voiceUrl,
        voiceDuration,
        messageType,
        senderName,
        expirationMinutes,
        senderProfile,
        receiverProfile
      );
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

  const handleDeleteAllMessages = async (userId1: string, userId2: string) => {
    setLoading(true);
    setError(null);
    try {
      // Optimistic update first
      deleteAllMessages(userId1, userId2);
      
      // Delete from database
      await chatService.deleteAllMessages(userId1, userId2);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const forwardMessage = async (message: Message, recipientIds: string[], originalSenderName?: string) => {
    setLoading(true);
    setError(null);
    try {
      await chatService.forwardMessage(message, currentUserId, recipientIds, originalSenderName);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob, replyTo?: Message) => {
    if (!selectedUserId) return;
    
    setLoading(true);
    setError(null);
    try {
      const { url, duration } = await chatService.uploadVoiceMessage(audioBlob);
      
      // Get expiration setting for this conversation
      const conversation = conversations.find(conv => conv.userId === selectedUserId);
      const expirationMinutes = conversation?.expirationMinutes || null;
      const receiverProfile = conversation ? {
        username: conversation.username,
        email: conversation.email,
        avatar: conversation.avatar,
      } : undefined;
      
      await chatService.sendMessage(
        currentUserId,
        selectedUserId,
        '',
        undefined,
        undefined,
        replyTo,
        url,
        duration,
        'user',
        undefined,
        expirationMinutes,
        senderProfile,
        receiverProfile
      );
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!selectedUserId || !lastCursorRef.current || isLoadingOlderRef.current) return;
    isLoadingOlderRef.current = true;
    try {
      const { messages: olderMessages, cursor, hasMore } = await chatService.loadOlderMessages(
        currentUserId,
        selectedUserId,
        lastCursorRef.current,
        50
      );
      if (olderMessages.length > 0) {
        const existingIds = new Set(messages.map(m => m.id));
        const merged = [...olderMessages.filter(m => !existingIds.has(m.id)), ...messages];
        setMessages(merged);
      }
      lastCursorRef.current = cursor;
      setHasMoreMessages(hasMore);
    } finally {
      isLoadingOlderRef.current = false;
    }
  };

  return {
    messages,
    sendMessage,
    editMessage,
    deleteMessage: handleDeleteMessage,
    deleteAllMessages: handleDeleteAllMessages,
    forwardMessage,
    sendVoiceMessage,
    loadOlderMessages,
    hasMoreMessages,
  };
};
