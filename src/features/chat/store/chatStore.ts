import { create } from 'zustand';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  fileUrl?: string | null;
  fileUrls?: string[] | null; // For multiple images
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  deleted?: boolean;
  replyTo?: {
    messageId: string;
    text: string;
    senderName: string;
  } | null;
  isForwarded?: boolean;
  originalSenderId?: string;
  originalSenderName?: string;
  forwardedBy?: string;
  voiceUrl?: string | null;
  voiceDuration?: number | null;
  seen?: boolean;
  seenAt?: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  username: string;
  email: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  lastMessageSeen?: boolean;
  unreadCount: number;
  isOnline?: boolean;
}

interface ChatState {
  messages: Message[];
  conversations: Conversation[];
  selectedUserId: string | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  replyingTo: Message | null;
  forwardingMessage: Message | null;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  deleteAllMessages: (userId1: string, userId2: string) => void;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (userId: string, updates: Partial<Conversation>) => void;
  markAsRead: (userId: string) => void;
  markAsSeen: (userId: string) => void;
  markMessageAsSeen: (messageId: string) => void;
  setSelectedUserId: (userId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  setReplyingTo: (message: Message | null) => void;
  setForwardingMessage: (message: Message | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  conversations: [],
  selectedUserId: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  replyingTo: null,
  forwardingMessage: null,
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  updateMessage: (messageId, updates) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    )
  })),
  deleteMessage: (messageId) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, deleted: true, text: 'This message was deleted', fileUrl: null, fileUrls: null } : msg
    )
  })),
  deleteAllMessages: (userId1, userId2) => set((state) => ({
    messages: [],
    conversations: state.conversations.filter(conv => 
      conv.userId !== userId1 && conv.userId !== userId2
    )
  })),
  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) => set((state) => {
    // Check if conversation already exists
    const exists = state.conversations.find(conv => conv.userId === conversation.userId);
    if (exists) {
      return state; // Don't add if already exists
    }
    return { conversations: [...state.conversations, conversation] };
  }),
  updateConversation: (userId, updates) => set((state) => ({
    conversations: state.conversations.map(conv => 
      conv.userId === userId ? { ...conv, ...updates } : conv
    )
  })),
  markAsRead: (userId) => set((state) => {
    // Only update if there are actually unread messages
    const conversation = state.conversations.find(conv => conv.userId === userId);
    if (!conversation || conversation.unreadCount === 0) {
      return state; // No change needed
    }
    
    return {
      conversations: state.conversations.map(conv => 
        conv.userId === userId ? { ...conv, unreadCount: 0 } : conv
      )
    };
  }),
  markAsSeen: (userId) => set((state) => {
    // Only update if there are actually unread messages to mark as seen
    const conversation = state.conversations.find(conv => conv.userId === userId);
    if (!conversation || conversation.unreadCount === 0) {
      return state; // No change needed
    }
    
    return {
      conversations: state.conversations.map(conv => 
        conv.userId === userId ? { ...conv, unreadCount: 0 } : conv
      )
    };
  }),
  markMessageAsSeen: (messageId) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, seen: true, seenAt: new Date() } : msg
    )
  })),
  setSelectedUserId: (selectedUserId) => set({ selectedUserId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [] }),
  setReplyingTo: (replyingTo) => set({ replyingTo }),
  setForwardingMessage: (forwardingMessage) => set({ forwardingMessage }),
}));
