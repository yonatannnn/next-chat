import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { groupChatService } from '../services/groupChatService';

interface UseGroupConversationsOptions {
  subscribe?: boolean;
}

export const useGroupConversations = (
  currentUserId: string,
  options: UseGroupConversationsOptions = {}
) => {
  const { 
    groupConversations, 
    setGroupConversations, 
    setLoading, 
    setError,
    searchQuery,
    setSearchQuery
  } = useChatStore();
  
  const isSubscribed = useRef(false);
  const { subscribe = true } = options;

  useEffect(() => {
    if (!currentUserId || !subscribe) return;

    setLoading(true);
    isSubscribed.current = true;
    
    let unsubscribe: (() => void) | null = null;
    
    groupChatService.getGroupConversations(
      currentUserId, 
      (newGroupConversations) => {
        setGroupConversations(newGroupConversations);
        setLoading(false);
      }
    ).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      isSubscribed.current = false;
    };
  }, [currentUserId, setGroupConversations, setLoading, subscribe]);

  const markGroupAsRead = (groupId: string) => {
    useChatStore.getState().markGroupAsRead(groupId);
  };

  const markGroupAsSeen = (groupId: string) => {
    useChatStore.getState().markGroupAsSeen(groupId);
  };

  return {
    groupConversations,
    searchQuery,
    markGroupAsRead,
    markGroupAsSeen,
  };
};
