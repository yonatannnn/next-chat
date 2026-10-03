import { create } from 'zustand';
import chatService from '../services/chatService';

const useChatStore = create((set, get) => ({
  // State
  messages: [],
  conversations: [], // List of conversations
  currentConversation: null,
  isLoading: false,
  error: null,
  isConnected: false,
  unreadCount: 0,

  // Actions
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({
    messages: [message, ...state.messages]
  })),
  
  setConversations: (conversations) => set({ conversations }),
  
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
  
  setConnected: (isConnected) => set({ isConnected }),
  
  setUnreadCount: (count) => set({ unreadCount: count }),
  
  sendMessage: async (senderId, receiverId, text, fileUrl = null, fileUrls = null, replyTo = null, voiceUrl = null, voiceDuration = null, messageType = 'user', senderName = null, expirationMinutes = null) => {
    set({ isLoading: true, error: null });
    try {
      const result = await chatService.sendMessage(
        senderId, 
        receiverId, 
        text, 
        fileUrl, 
        fileUrls, 
        replyTo, 
        voiceUrl, 
        voiceDuration, 
        messageType, 
        senderName, 
        expirationMinutes
      );
      
      if (result.success) {
        set({ isLoading: false });
        return { success: true, messageId: result.id };
      } else {
        set({ error: result.error, isLoading: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  editMessage: async (messageId, newText) => {
    set({ isLoading: true, error: null });
    try {
      const result = await chatService.editMessage(messageId, newText);
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  deleteMessage: async (messageId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await chatService.deleteMessage(messageId);
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  markMessageAsSeen: async (messageId) => {
    try {
      const result = await chatService.markMessageAsSeen(messageId);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteAllMessages: async (userId1, userId2) => {
    set({ isLoading: true, error: null });
    try {
      const result = await chatService.deleteAllMessages(userId1, userId2);
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  forwardMessage: async (originalMessage, senderId, recipientIds, originalSenderName) => {
    set({ isLoading: true, error: null });
    try {
      const result = await chatService.forwardMessage(originalMessage, senderId, recipientIds, originalSenderName);
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  subscribeToMessages: (currentUserId, otherUserId, callback) => {
    return chatService.subscribeToMessages(currentUserId, otherUserId, (messages) => {
      set({ messages });
      callback(messages);
    });
  },

  subscribeToAllIncomingMessages: (currentUserId, callback) => {
    return chatService.subscribeToAllIncomingMessages(currentUserId, (messages) => {
      // Update unread count
      const unreadCount = messages.filter(msg => !msg.seen).length;
      set({ unreadCount });
      callback(messages);
    });
  },
  
  clearMessages: () => set({ messages: [] }),
  
  clearConversations: () => set({ conversations: [] }),
}));

export default useChatStore;
