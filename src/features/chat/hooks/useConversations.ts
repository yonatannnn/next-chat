import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { improvedConversationService } from '../services/improvedConversationService';

export const useConversations = (currentUserId: string) => {
  const { 
    conversations, 
    setConversations, 
    setLoading, 
    setError,
    searchQuery,
    setSearchQuery
  } = useChatStore();
  
  const isSubscribed = useRef(false);

  useEffect(() => {
    if (!currentUserId || isSubscribed.current) return;

    setLoading(true);
    isSubscribed.current = true;
    
    const unsubscribe = improvedConversationService.subscribeToConversations(
      currentUserId, 
      (newConversations) => {
        setConversations(newConversations);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      isSubscribed.current = false;
    };
  }, [currentUserId, setConversations, setLoading]);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchQuery('');
      return [];
    }
    
    setSearchQuery(query);
    setLoading(true);
    
    try {
      const results = await improvedConversationService.searchUsers(query, currentUserId);
      setLoading(false);
      return results;
    } catch (error) {
      setError('Failed to search users');
      setLoading(false);
      return [];
    }
  };

  const markAsRead = (userId: string) => {
    useChatStore.getState().markAsRead(userId);
  };

  const markAsSeen = (userId: string) => {
    useChatStore.getState().markAsSeen(userId);
  };

  return {
    conversations,
    searchQuery,
    searchUsers,
    markAsRead,
    markAsSeen,
  };
};
