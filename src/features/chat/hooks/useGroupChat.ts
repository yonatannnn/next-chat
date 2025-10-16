import { useEffect, useRef } from 'react';
import { useChatStore, Message } from '../store/chatStore';
import { groupChatService } from '../services/groupChatService';

export const useGroupChat = (currentUserId: string, selectedGroupId: string | null) => {
  const { 
    messages, 
    setMessages, 
    updateMessage,
    deleteMessage: deleteMessageFromStore,
    setLoading, 
    setError 
  } = useChatStore();
  
  const lastEditTime = useRef<number>(0);
  const lastDeleteTime = useRef<number>(0);
  const RATE_LIMIT_MS = 2000; // 2 seconds between operations

  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const unsubscribe = groupChatService.subscribeToGroupMessages(
      selectedGroupId,
      (newMessages) => {
        setMessages(newMessages);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedGroupId, setMessages, setLoading]);

  const sendMessage = async (
    text: string, 
    fileUrl?: string, 
    fileUrls?: string[], 
    replyTo?: any, 
    voiceUrl?: string, 
    voiceDuration?: number
  ) => {
    if (!selectedGroupId) return;
    
    try {
      await groupChatService.sendGroupMessage(
        selectedGroupId, 
        currentUserId, 
        text, 
        fileUrl, 
        fileUrls, 
        replyTo, 
        voiceUrl, 
        voiceDuration
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

    try {
      await groupChatService.editGroupMessage(messageId, newText);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const deleteMessage = async (messageId: string) => {
    const now = Date.now();
    if (now - lastDeleteTime.current < RATE_LIMIT_MS) {
      setError('Please wait before deleting another message');
      return;
    }
    lastDeleteTime.current = now;

    try {
      await groupChatService.deleteGroupMessage(messageId);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const markMessageAsSeen = async (messageId: string) => {
    try {
      await groupChatService.markGroupMessageAsSeen(messageId);
    } catch (error: unknown) {
      console.error('Error marking group message as seen:', error);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob, replyTo?: Message) => {
    try {
      const { url, duration } = await groupChatService.uploadVoiceMessage(audioBlob);
      await sendMessage('', undefined, undefined, replyTo, url, duration);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    markMessageAsSeen,
    sendVoiceMessage,
  };
};
