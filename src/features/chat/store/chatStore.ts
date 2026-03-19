import { create } from 'zustand';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  groupId?: string; // For group messages
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
  // Message expiration fields
  expiresAt?: Date | null;
  expirationMinutes?: number | null;
  isExpired?: boolean;
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
  hidden?: boolean;
  hardHidden?: boolean;
  expirationMinutes?: number | null;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  createdBy: string;
  createdAt: Date;
  members: GroupMember[];
  isActive: boolean;
}

export interface GroupMember {
  userId: string;
  username: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  isActive: boolean;
}

export interface GroupConversation {
  id: string;
  groupId: string;
  groupName: string;
  groupAvatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  lastMessageSeen?: boolean;
  unreadCount: number;
  memberCount: number;
  isActive: boolean;
  expirationMinutes?: number | null;
}

interface ChatState {
  messages: Message[];
  conversations: Conversation[];
  groupConversations: GroupConversation[];
  selectedUserId: string | null;
  selectedGroupId: string | null;
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
  updateConversationsPreservingStates: (newConversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (userId: string, updates: Partial<Conversation>) => void;
  setGroupConversations: (groupConversations: GroupConversation[]) => void;
  addGroupConversation: (groupConversation: GroupConversation) => void;
  updateGroupConversation: (groupId: string, updates: Partial<GroupConversation>) => void;
  markAsRead: (userId: string) => void;
  markAsSeen: (userId: string) => void;
  markGroupAsRead: (groupId: string) => void;
  markGroupAsSeen: (groupId: string) => void;
  markMessageAsSeen: (messageId: string) => void;
  setSelectedUserId: (userId: string | null) => void;
  setSelectedGroupId: (groupId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  setReplyingTo: (message: Message | null) => void;
  setForwardingMessage: (message: Message | null) => void;
  hideConversation: (userId: string) => void;
  unhideConversation: (userId: string) => void;
  hardHideConversation: (userId: string) => void;
  unhideHardHiddenConversation: (userId: string) => void;
  setConversationExpiration: (userId: string, expirationMinutes: number | null) => void;
  setGroupConversationExpiration: (groupId: string, expirationMinutes: number | null) => void;
  clearConversationExpiration: (userId: string) => void;
  clearGroupConversationExpiration: (groupId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  conversations: [],
  groupConversations: [],
  selectedUserId: null,
  selectedGroupId: null,
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
  updateConversationsPreservingStates: (newConversations) => set((state) => {
    // Create a map of existing conversations to preserve hidden/hardHidden states
    const existingConversationsMap = new Map(
      state.conversations.map(conv => [conv.userId, conv])
    );
    const serverUserIds = new Set(newConversations.map((c) => c.userId));

    // Update conversations from server while preserving hidden/hardHidden states
    const updatedConversations = newConversations.map((newConv) => {
      const existingConv = existingConversationsMap.get(newConv.userId);
      if (existingConv) {
        return {
          ...newConv,
          hidden: existingConv.hidden,
          hardHidden: existingConv.hardHidden,
        };
      }
      return newConv;
    });

    // Keep locally-added conversations (e.g. from "Start chat" with a user that has no conversation doc yet)
    const localOnly = state.conversations.filter((conv) => !serverUserIds.has(conv.userId));
    const merged = [...updatedConversations, ...localOnly];

    return { conversations: merged };
  }),
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
  setGroupConversations: (groupConversations) => set({ groupConversations }),
  addGroupConversation: (groupConversation) => set((state) => {
    // Check if group conversation already exists
    const exists = state.groupConversations.find(conv => conv.groupId === groupConversation.groupId);
    if (exists) {
      return state; // Don't add if already exists
    }
    return { groupConversations: [...state.groupConversations, groupConversation] };
  }),
  updateGroupConversation: (groupId, updates) => set((state) => ({
    groupConversations: state.groupConversations.map(conv => 
      conv.groupId === groupId ? { ...conv, ...updates } : conv
    )
  })),
  markGroupAsRead: (groupId) => set((state) => {
    const groupConversation = state.groupConversations.find(conv => conv.groupId === groupId);
    if (!groupConversation || groupConversation.unreadCount === 0) {
      return state; // No change needed
    }
    
    return {
      groupConversations: state.groupConversations.map(conv => 
        conv.groupId === groupId ? { ...conv, unreadCount: 0 } : conv
      )
    };
  }),
  markGroupAsSeen: (groupId) => set((state) => {
    const groupConversation = state.groupConversations.find(conv => conv.groupId === groupId);
    if (!groupConversation || groupConversation.unreadCount === 0) {
      return state; // No change needed
    }
    
    return {
      groupConversations: state.groupConversations.map(conv => 
        conv.groupId === groupId ? { ...conv, unreadCount: 0 } : conv
      )
    };
  }),
  setSelectedUserId: (selectedUserId) => set({ selectedUserId }),
  setSelectedGroupId: (selectedGroupId) => set({ selectedGroupId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [] }),
  setReplyingTo: (replyingTo) => set({ replyingTo }),
  setForwardingMessage: (forwardingMessage) => set({ forwardingMessage }),
  hideConversation: (userId) => set((state) => ({
    conversations: state.conversations.map(conv => 
      conv.userId === userId ? { ...conv, hidden: true } : conv
    )
  })),
  unhideConversation: (userId) => set((state) => ({
    conversations: state.conversations.map(conv => 
      conv.userId === userId ? { ...conv, hidden: false } : conv
    )
  })),
  hardHideConversation: (userId) => set((state) => ({
    conversations: state.conversations.map(conv => 
      conv.userId === userId ? { ...conv, hardHidden: true, hidden: false } : conv
    )
  })),
  unhideHardHiddenConversation: (userId) => set((state) => ({
    conversations: state.conversations.map(conv => 
      conv.userId === userId ? { ...conv, hardHidden: false, hidden: false } : conv
    )
  })),
  setConversationExpiration: (userId, expirationMinutes) => set((state) => ({
    conversations: state.conversations.map(conv => 
      conv.userId === userId ? { ...conv, expirationMinutes } : conv
    )
  })),
  setGroupConversationExpiration: (groupId, expirationMinutes) => set((state) => ({
    groupConversations: state.groupConversations.map(conv => 
      conv.groupId === groupId ? { ...conv, expirationMinutes } : conv
    )
  })),
  clearConversationExpiration: (userId) => set((state) => ({
    conversations: state.conversations.map(conv => 
      conv.userId === userId ? { ...conv, expirationMinutes: null } : conv
    )
  })),
  clearGroupConversationExpiration: (groupId) => set((state) => ({
    groupConversations: state.groupConversations.map(conv => 
      conv.groupId === groupId ? { ...conv, expirationMinutes: null } : conv
    )
  })),
}));
