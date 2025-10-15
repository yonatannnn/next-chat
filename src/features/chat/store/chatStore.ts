import { create } from 'zustand';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  fileUrl?: string;
  fileUrls?: string[]; // For multiple images
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  deleted?: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  username: string;
  email: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
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
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  setConversations: (conversations: Conversation[]) => void;
  updateConversation: (userId: string, updates: Partial<Conversation>) => void;
  markAsRead: (userId: string) => void;
  markAsSeen: (userId: string) => void;
  setSelectedUserId: (userId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  conversations: [],
  selectedUserId: null,
  isLoading: false,
  error: null,
  searchQuery: '',
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
      msg.id === messageId ? { ...msg, deleted: true } : msg
    )
  })),
  setConversations: (conversations) => set({ conversations }),
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
  setSelectedUserId: (selectedUserId) => set({ selectedUserId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [] }),
}));
