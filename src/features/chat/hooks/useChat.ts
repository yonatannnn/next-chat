import { useEffect, useRef, useState } from 'react';
import { useChatStore, Message } from '../store/chatStore';
import { chatService } from '../services/chatService';
import { useUsersStore } from '@/features/users/store/usersStore';

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
  const cacheWriteTimerRef = useRef<NodeJS.Timeout | null>(null);

  const CACHE_VERSION = 1;
  const MAX_CACHED_MESSAGES = 350;

  const getCacheKey = (userId: string, otherUserId: string) =>
    `chat_cache_v${CACHE_VERSION}:${userId}:${otherUserId}`;

  const serializeDate = (value?: Date | null) => (value ? value.toISOString() : null);

  const serializeMessages = (input: Message[]) => {
    return input.map((m) => ({
      ...m,
      timestamp: serializeDate(m.timestamp),
      editedAt: serializeDate(m.editedAt),
      seenAt: serializeDate(m.seenAt),
      expiresAt: serializeDate(m.expiresAt),
    }));
  };

  const hydrateDate = (value?: string | null) => (value ? new Date(value) : undefined);

  const hydrateMessages = (input: any[]): Message[] => {
    return input.map((m) => ({
      ...m,
      timestamp: hydrateDate(m.timestamp) || new Date(),
      editedAt: hydrateDate(m.editedAt),
      seenAt: hydrateDate(m.seenAt),
      expiresAt: hydrateDate(m.expiresAt) || null,
    }));
  };

  const loadCachedMessages = (userId: string, otherUserId: string): Message[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(getCacheKey(userId, otherUserId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.messages)) return [];
      return hydrateMessages(parsed.messages);
    } catch (error) {
      console.error('Failed to read message cache:', error);
      return [];
    }
  };

  const saveCachedMessages = (userId: string, otherUserId: string, input: Message[]) => {
    if (typeof window === 'undefined') return;
    try {
      const trimmed = input.slice(-MAX_CACHED_MESSAGES);
      const payload = {
        version: CACHE_VERSION,
        savedAt: Date.now(),
        messages: serializeMessages(trimmed),
      };
      window.localStorage.setItem(getCacheKey(userId, otherUserId), JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to write message cache:', error);
    }
  };

  const mergeMessages = (existing: Message[], incoming: Message[]) => {
    if (existing.length === 0) return incoming;
    const merged = new Map<string, Message>();
    existing.forEach((m) => merged.set(m.id, m));
    incoming.forEach((m) => merged.set(m.id, m));
    return Array.from(merged.values()).sort((a, b) => {
      const timeA = a.timestamp?.getTime() || 0;
      const timeB = b.timestamp?.getTime() || 0;
      return timeA - timeB;
    });
  };

  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      return;
    }

    const cachedMessages = loadCachedMessages(currentUserId, selectedUserId);
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
      setLoading(false);
    } else {
      // Clear previous conversation messages immediately to avoid stale UI.
      setMessages([]);
      setLoading(true);
    }
    lastCursorRef.current = null;
    setHasMoreMessages(false);
    const subscriptionId = ++subscriptionIdRef.current;
    const unsubscribe = chatService.subscribeToMessages(
      currentUserId,
      selectedUserId,
      (newMessages, cursor, hasMore) => {
        if (subscriptionIdRef.current !== subscriptionId) {
          return;
        }
        const latestMessages = mergeMessages(
          useChatStore.getState().messages,
          newMessages
        );
        setMessages(latestMessages);
        lastCursorRef.current = cursor;
        setHasMoreMessages(hasMore);
        setLoading(false);
      },
      { limit: 50 }
    );

    return () => unsubscribe();
  }, [currentUserId, selectedUserId, setMessages, setLoading]);

  useEffect(() => {
    if (!selectedUserId || !currentUserId) return;
    if (cacheWriteTimerRef.current) {
      clearTimeout(cacheWriteTimerRef.current);
    }
    cacheWriteTimerRef.current = setTimeout(() => {
      saveCachedMessages(currentUserId, selectedUserId, messages);
    }, 300);

    return () => {
      if (cacheWriteTimerRef.current) {
        clearTimeout(cacheWriteTimerRef.current);
        cacheWriteTimerRef.current = null;
      }
    };
  }, [messages, currentUserId, selectedUserId]);

  const sendMessage = async (text: string, fileUrl?: string, fileUrls?: string[], replyTo?: any, voiceUrl?: string, voiceDuration?: number, messageType?: 'system', senderName?: string) => {
    if (!selectedUserId) return;
    
    try {
      // Get expiration setting for this conversation
      const conversation = conversations.find(conv => conv.userId === selectedUserId);
      const expirationMinutes = conversation?.expirationMinutes || null;
      let receiverProfile = conversation
        ? {
            username: conversation.username,
            email: conversation.email,
            avatar: conversation.avatar,
          }
        : undefined;

      if (!receiverProfile || receiverProfile.username === 'Unknown') {
        const fallbackUser = useUsersStore.getState().users.find(
          (user) => user.id === selectedUserId
        );
        if (fallbackUser) {
          receiverProfile = {
            username: fallbackUser.username,
            email: fallbackUser.email,
            avatar: fallbackUser.avatar,
          };
        }
      }
      
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
