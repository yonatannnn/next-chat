import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ChatInfoModal } from '@/components/ui/ChatInfoModal';
import { useChatStore, Message } from '@/features/chat/store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useChat } from '@/features/chat/hooks/useChat';
import { useGroupChat } from '@/features/chat/hooks/useGroupChat';
import { useConversations } from '@/features/chat/hooks/useConversations';
import { useGroupConversations } from '@/features/chat/hooks/useGroupConversations';
import { chatService } from '@/features/chat/services/chatService';
import { groupChatService } from '@/features/chat/services/groupChatService';
import { supabase } from '@/lib/supabase';
import { ForwardMessageModal } from '@/components/ui/ForwardMessageModal';
import { AddMembersModal } from '@/components/ui/AddMembersModal';
import { ProfileRecommendationBubble } from '@/components/ui/ProfileRecommendationBubble';
import { MessageExpirationInput } from '@/components/ui/MessageExpirationInput';
import { useRecommendations } from '@/features/profile/hooks/useRecommendations';
import { conversationSettingsService } from '@/services/conversationSettingsService';
import { Trash2, Info, Users, Search, X, ChevronUp, ChevronDown, EyeOff, Lock, AlertTriangle, Clock } from 'lucide-react';
import { MessageSkeleton } from '@/components/ui/Skeleton';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

interface ChatWindowProps {
  isMobileSearchOpen?: boolean;
  setIsMobileSearchOpen?: (open: boolean) => void;
  onExpirationDialogTrigger?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  isMobileSearchOpen = false, 
  setIsMobileSearchOpen,
  onExpirationDialogTrigger
}) => {
  const router = useRouter();
  const { selectedUserId, selectedGroupId, messages, conversations, groupConversations, setSelectedUserId, setSelectedGroupId, replyingTo, setReplyingTo, forwardingMessage, setForwardingMessage, hideConversation, unhideConversation, hardHideConversation, setConversationExpiration, setGroupConversationExpiration } = useChatStore();
  const { userData } = useAuthStore();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { markAsSeen } = useConversations(userData?.id || '');
  const { markGroupAsRead, markGroupAsSeen } = useGroupConversations(
    userData?.id || '',
    { subscribe: false }
  );
  const { recommendations, acceptRecommendation, rejectRecommendation, deleteRecommendation } = useRecommendations(userData?.id || '');
  const { isOtherUserTyping, handleTyping, clearTyping } = useTypingIndicator(userData?.id, selectedUserId);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [processingRecommendation, setProcessingRecommendation] = useState<string | null>(null);
  const [showHardHideConfirm, setShowHardHideConfirm] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isExpirationSelectorOpen, setIsExpirationSelectorOpen] = useState(false);
  const [currentExpiration, setCurrentExpiration] = useState<number | null>(null);

  // Helper function to format expiration time
  const formatExpirationTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days}d`;
    }
  };

  // Get current expiration setting when opening selector
  useEffect(() => {
    const loadExpirationSettings = async () => {
      if (isExpirationSelectorOpen && userData?.id) {
        if (selectedUserId) {
          // First try to get from local state
          const conversation = conversations.find(conv => conv.userId === selectedUserId);
          let expiration = conversation?.expirationMinutes || null;
          
          // If not found in local state, try to load from database
          if (expiration === null) {
            try {
              expiration = await conversationSettingsService.getConversationExpiration(
                userData.id, 
                selectedUserId
              );
              // Update local state with database value
              if (expiration !== null) {
                setConversationExpiration(selectedUserId, expiration);
              }
            } catch (error) {
              console.error('Error loading conversation expiration from database:', error);
            }
          }
          
          console.log(`Getting expiration for user ${selectedUserId}: ${expiration} minutes`);
          setCurrentExpiration(expiration);
        } else if (selectedGroupId) {
          // First try to get from local state
          const groupConversation = groupConversations.find(conv => conv.groupId === selectedGroupId);
          let expiration = groupConversation?.expirationMinutes || null;
          
          // If not found in local state, try to load from database
          if (expiration === null) {
            try {
              expiration = await conversationSettingsService.getGroupExpiration(
                userData.id, 
                selectedGroupId
              );
              // Update local state with database value
              if (expiration !== null) {
                setGroupConversationExpiration(selectedGroupId, expiration);
              }
            } catch (error) {
              console.error('Error loading group expiration from database:', error);
            }
          }
          
          console.log(`Getting expiration for group ${selectedGroupId}: ${expiration} minutes`);
          setCurrentExpiration(expiration);
        }
      }
    };

    loadExpirationSettings();
  }, [isExpirationSelectorOpen, selectedUserId, selectedGroupId, conversations, groupConversations, userData?.id, setConversationExpiration, setGroupConversationExpiration]);

  // Load expiration settings when chat is selected
  useEffect(() => {
    const loadChatExpirationSettings = async () => {
      if (userData?.id && (selectedUserId || selectedGroupId)) {
        if (selectedUserId) {
          try {
            const expiration = await conversationSettingsService.getConversationExpiration(
              userData.id, 
              selectedUserId
            );
            if (expiration !== null) {
              setConversationExpiration(selectedUserId, expiration);
            }
          } catch (error) {
            console.error('Error loading conversation expiration on chat select:', error);
          }
        } else if (selectedGroupId) {
          try {
            const expiration = await conversationSettingsService.getGroupExpiration(
              userData.id, 
              selectedGroupId
            );
            if (expiration !== null) {
              setGroupConversationExpiration(selectedGroupId, expiration);
            }
          } catch (error) {
            console.error('Error loading group expiration on chat select:', error);
          }
        }
      }
    };

    loadChatExpirationSettings();
  }, [selectedUserId, selectedGroupId, userData?.id, setConversationExpiration, setGroupConversationExpiration]);

  // Handle mobile search state
  useEffect(() => {
    if (isMobileSearchOpen && setIsMobileSearchOpen) {
      setIsSearchOpen(true);
      setIsMobileSearchOpen(false); // Reset mobile state
    }
  }, [isMobileSearchOpen, setIsMobileSearchOpen]);

  // Handle mobile expiration dialog trigger
  useEffect(() => {
    if (onExpirationDialogTrigger) {
      // Create a global function that can be called from the parent
      (window as any).triggerExpirationDialog = () => {
        setIsExpirationSelectorOpen(true);
      };
    }
  }, [onExpirationDialogTrigger]);

  // Track previous chat to only reset scroll when actually switching chats
  const [previousChatId, setPreviousChatId] = useState<string | null>(null);
  const [followOutput, setFollowOutput] = useState(true);

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const filteredMessages = messages.filter(message => 
      message.text.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filteredMessages);
    setCurrentSearchIndex(0);
    
    // Scroll to first result if found
    if (filteredMessages.length > 0) {
      const index = messages.findIndex(m => m.id === filteredMessages[0].id);
      if (index >= 0) {
        virtuosoRef.current?.scrollToIndex({ index, behavior: 'smooth', align: 'center' });
      }
    }
  };

  const navigateSearch = (direction: 'up' | 'down') => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (direction === 'up') {
      newIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
    } else {
      newIndex = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0;
    }
    
    setCurrentSearchIndex(newIndex);
    
    // Scroll to the current search result
    const currentMessage = searchResults[newIndex];
    if (currentMessage) {
      const index = messages.findIndex(m => m.id === currentMessage.id);
      if (index >= 0) {
        virtuosoRef.current?.scrollToIndex({ index, behavior: 'smooth', align: 'center' });
      }
    }
  };

  const closeSearch = () => {
    // Store the current search result position before closing
    const currentResult = searchResults[currentSearchIndex];
    
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
    
    // Scroll back to the last viewed search result
    if (currentResult) {
      const index = messages.findIndex(m => m.id === currentResult.id);
      if (index >= 0) {
        virtuosoRef.current?.scrollToIndex({ index, behavior: 'smooth', align: 'center' });
      }
    }
  };

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSearchOpen) return;
      
      if (e.key === 'Escape') {
        closeSearch();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchResults.length > 0) {
          navigateSearch('down');
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateSearch('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateSearch('down');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, searchResults.length, currentSearchIndex]);
  const { sendMessage, editMessage, deleteMessage, deleteAllMessages, forwardMessage, sendVoiceMessage, loadOlderMessages, hasMoreMessages, retryMessage } = useChat(
    userData?.id || '',
    selectedUserId,
    userData ? { username: userData.username, email: userData.email, avatar: userData.avatar } : undefined
  );
  const { sendMessage: sendGroupMessage, editMessage: editGroupMessage, deleteMessage: deleteGroupMessage, sendVoiceMessage: sendGroupVoiceMessage } = useGroupChat(userData?.id || '', selectedGroupId);

  const selectedUser = conversations.find(user => user.userId === selectedUserId);
  const selectedGroup = groupConversations.find(group => group.groupId === selectedGroupId);
  const isGroupChat = !!selectedGroupId;

  // Reset follow output when switching chats
  useEffect(() => {
    setFollowOutput(true);
    setIsInitialLoad(true);
  }, [selectedUserId, selectedGroupId]);

  useEffect(() => {
    if (selectedUserId || selectedGroupId) {
      // Get current chat ID
      const currentChatId = selectedUserId || selectedGroupId;

      // Only reset scroll state when actually switching to a different chat
      if (currentChatId !== previousChatId) {
        setPreviousChatId(currentChatId);
      }

      // Only mark as seen if there are unread messages
      if (selectedUserId) {
        const conversation = conversations.find(conv => conv.userId === selectedUserId);
        if (conversation && conversation.unreadCount > 0) {
          markAsSeen(selectedUserId);
          if (userData?.id) {
            chatService.markConversationRead(userData.id, selectedUserId).catch((error) => {
              console.error('Error marking conversation as read:', error);
            });
          }
        }
      } else if (selectedGroupId) {
        const groupConversation = groupConversations.find(conv => conv.groupId === selectedGroupId);
        if (groupConversation && groupConversation.unreadCount > 0) {
          markGroupAsSeen(selectedGroupId);
        }
      }
    }
  }, [selectedUserId, selectedGroupId, previousChatId, conversations, groupConversations, markAsSeen, markGroupAsSeen]);

  const handleLoadOlderMessages = async () => {
    await loadOlderMessages();
  };

  const handleSendMessage = async (text: string, fileUrl?: string, fileUrls?: string[], replyTo?: any) => {
    clearTyping();
    if (selectedUserId) {
      await sendMessage(text, fileUrl, fileUrls, replyTo, undefined, undefined, undefined, userData?.username);
    } else if (selectedGroupId) {
      await sendGroupMessage(text, fileUrl, fileUrls, replyTo);
    }
    setReplyingTo(null); // Clear reply state after sending
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `chat-files/${fileName}`;

    const { error } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file);

    if (error) {
      throw new Error(error.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleMultipleFileUpload = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(file => handleFileUpload(file));
    return Promise.all(uploadPromises);
  };

  const handleDeleteChat = async () => {
    if (selectedUserId && userData?.id && window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      try {
        // Delete all messages between the two users
        await deleteAllMessages(userData.id, selectedUserId);
        // Clear the selected user
        setSelectedUserId(null);
      } catch (error) {
        console.error('Error deleting chat:', error);
        // You might want to show an error message to the user here
      }
    }
  };

  const handleHideChat = () => {
    if (selectedUserId) {
      hideConversation(selectedUserId);
      setSelectedUserId(null);
    }
  };

  const handleHardHideChat = () => {
    setShowHardHideConfirm(true);
  };

  const confirmHardHide = () => {
    if (selectedUserId) {
      hardHideConversation(selectedUserId);
      setSelectedUserId(null);
      setShowHardHideConfirm(false);
    }
  };

  const cancelHardHide = () => {
    setShowHardHideConfirm(false);
  };

  const handleChatInfo = () => {
    setIsChatInfoOpen(true);
  };

  const handleReply = (message: any) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleForward = (message: any) => {
    setForwardingMessage(message);
  };

  const handleForwardMessage = async (message: any, recipientIds: string[]) => {
    try {
      // Get the original sender name from the current conversation or messages
      const originalSenderName = message.senderId === userData?.id ? 'You' : selectedUser?.username || 'Unknown';
      await forwardMessage(message, recipientIds, originalSenderName);
      setForwardingMessage(null);
    } catch (error) {
      console.error('Error forwarding message:', error);
    }
  };

  const handleCancelForward = () => {
    setForwardingMessage(null);
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId || !userData?.id) return;
    
    if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        await groupChatService.deleteGroup(selectedGroupId);
        setSelectedGroupId(null);
        // The group will be removed from the list automatically via the subscription
      } catch (error) {
        console.error('Error deleting group:', error);
        alert('Failed to delete group. Please try again.');
      }
    }
  };

  const handleAddMembers = () => {
    setIsAddMembersOpen(true);
  };

  const handleMembersAdded = () => {
    // Members will be updated automatically via the subscription
    console.log('Members added successfully');
  };

  const handleAcceptRecommendation = async (recommendationId: string) => {
    setProcessingRecommendation(recommendationId);
    try {
      await acceptRecommendation(recommendationId);
      
      // Send personal message to recommender
      console.log('Sending acceptance message...');
      if (selectedUserId) {
        await sendMessage("✅ Profile picture recommendation accepted.", undefined, undefined, undefined, undefined, undefined, undefined, userData?.username);
      } else if (selectedGroupId) {
        await sendGroupMessage("✅ Profile picture recommendation accepted.");
      }
      console.log('Acceptance message sent');
    } catch (error) {
      console.error('Error accepting recommendation:', error);
    } finally {
      setProcessingRecommendation(null);
    }
  };

  const handleRejectRecommendation = async (recommendationId: string) => {
    setProcessingRecommendation(recommendationId);
    try {
      await rejectRecommendation(recommendationId);
      
      // Send personal message to recommender
      console.log('Sending rejection message...');
      if (selectedUserId) {
        await sendMessage("❌ Profile picture recommendation rejected.", undefined, undefined, undefined, undefined, undefined, undefined, userData?.username);
      } else if (selectedGroupId) {
        await sendGroupMessage("❌ Profile picture recommendation rejected.");
      }
      console.log('Rejection message sent');
    } catch (error) {
      console.error('Error rejecting recommendation:', error);
    } finally {
      setProcessingRecommendation(null);
    }
  };

  const handleDeleteRecommendation = async (recommendationId: string) => {
    setProcessingRecommendation(recommendationId);
    try {
      await deleteRecommendation(recommendationId);
    } catch (error) {
      console.error('Error deleting recommendation:', error);
    } finally {
      setProcessingRecommendation(null);
    }
  };


  const handleSendVoiceMessage = async (audioBlob: Blob, replyTo?: Message) => {
    try {
      if (selectedUserId) {
        await sendVoiceMessage(audioBlob, replyTo);
      } else if (selectedGroupId) {
        await sendGroupVoiceMessage(audioBlob, replyTo);
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
    }
  };

  const handleExpirationSelect = async (minutes: number | null) => {
    setCurrentExpiration(minutes);
    
    // Store the expiration setting for this chat
    if (selectedUserId && userData?.id) {
      console.log(`Setting expiration for user ${selectedUserId}: ${minutes} minutes`);
      setConversationExpiration(selectedUserId, minutes);
      
      // Persist to database
      try {
        await conversationSettingsService.saveConversationExpiration(
          userData.id, 
          selectedUserId, 
          minutes
        );
      } catch (error) {
        console.error('Error saving conversation expiration settings:', error);
      }
    } else if (selectedGroupId && userData?.id) {
      console.log(`Setting expiration for group ${selectedGroupId}: ${minutes} minutes`);
      setGroupConversationExpiration(selectedGroupId, minutes);
      
      // Persist to database
      try {
        await conversationSettingsService.saveGroupExpiration(
          userData.id, 
          selectedGroupId, 
          minutes
        );
      } catch (error) {
        console.error('Error saving group expiration settings:', error);
      }
    }
  };

  const dropdownItems = [
    {
      id: 'search',
      label: 'Search Messages',
      icon: <Search size={16} />,
      onClick: () => setIsSearchOpen(true),
    },
    {
      id: 'expiration',
      label: 'Message Expiration',
      icon: <Clock size={16} />,
      onClick: () => setIsExpirationSelectorOpen(true),
    },
    {
      id: 'chat-info',
      label: isGroupChat ? 'Group Info' : 'Chat Info',
      icon: <Info size={16} />,
      onClick: handleChatInfo,
    },
    ...(isGroupChat ? [
      {
        id: 'add-members',
        label: 'Add Members',
        icon: <Users size={16} />,
        onClick: handleAddMembers,
      },
      {
        id: 'delete-group',
        label: 'Delete Group',
        icon: <Trash2 size={16} />,
        onClick: handleDeleteGroup,
        variant: 'danger' as const,
      }
    ] : [
      {
        id: 'hide-chat',
        label: selectedUser?.hidden ? 'Unhide Chat' : 'Hide Chat',
        icon: <EyeOff size={16} />,
        onClick: selectedUser?.hidden ? () => {
          if (selectedUserId) {
            unhideConversation(selectedUserId);
          }
        } : handleHideChat,
      },
      {
        id: 'hard-hide-chat',
        label: 'Hard Hide Chat',
        icon: <Lock size={16} />,
        onClick: handleHardHideChat,
        variant: 'danger' as const,
      },
      {
        id: 'delete-chat',
        label: 'Delete Chat',
        icon: <Trash2 size={16} />,
        onClick: handleDeleteChat,
        variant: 'danger' as const,
      }
    ]),
  ];

  if (!selectedUserId && !selectedGroupId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800 p-4">
        <div className="text-center max-w-sm">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Select a chat to start messaging
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
            Choose a user or group from the sidebar to begin your conversation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 h-full overflow-hidden">
      {/* Chat Header - Fixed - Hidden on mobile since mobile header shows this info */}
      <div className="hidden md:flex flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
            <button
              onClick={() => isGroupChat ? undefined : router.push(`/friend/${selectedUserId}`)}
              className="hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <Avatar
                src={isGroupChat ? selectedGroup?.groupAvatar : selectedUser?.avatar}
                alt={isGroupChat ? selectedGroup?.groupName || 'Group' : selectedUser?.username || 'User'}
                size="sm"
                className="md:w-10 md:h-10"
              />
            </button>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base truncate">
                {isGroupChat ? selectedGroup?.groupName : selectedUser?.username}
              </h3>
              <div className="flex items-center space-x-2">
                {isGroupChat && selectedGroup && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedGroup.memberCount} member{selectedGroup.memberCount !== 1 ? 's' : ''}
                  </p>
                )}
                {((selectedUser?.expirationMinutes && selectedUser.expirationMinutes > 0) || 
                  (selectedGroup?.expirationMinutes && selectedGroup.expirationMinutes > 0)) && (
                  <div className="flex items-center space-x-1">
                    <Clock size={12} className="text-orange-500" />
                    <span className="text-xs text-orange-600 dark:text-orange-400">
                      {isGroupChat 
                        ? formatExpirationTime(selectedGroup?.expirationMinutes || 0)
                        : formatExpirationTime(selectedUser?.expirationMinutes || 0)
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            <DropdownMenu items={dropdownItems} />
          </div>
        </div>
      </div>

      {/* Search Interface */}
      {isSearchOpen && (
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={closeSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {currentSearchIndex + 1} of {searchResults.length}
                </span>
                <button
                  onClick={() => navigateSearch('up')}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  disabled={searchResults.length === 0}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => navigateSearch('down')}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  disabled={searchResults.length === 0}
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages - Virtualized */}
      <div className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-gray-900">
        {messages.length === 0 && isInitialLoad ? (
          <MessageSkeleton count={7} />
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            key={selectedUserId || selectedGroupId || 'none'}
            data={messages}
            initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
            followOutput={followOutput ? 'smooth' : false}
            atBottomStateChange={(atBottom) => {
              setIsAtBottom(atBottom);
              setFollowOutput(atBottom);
            }}
            increaseViewportBy={{ top: 300, bottom: 100 }}
            className="messages-container"
            style={{ height: '100%' }}
            components={{
              Header: () => (
                <div className="pt-4 px-3 md:px-4">
                  {selectedUserId && hasMoreMessages && (
                    <div className="flex justify-center mb-3">
                      <button
                        onClick={handleLoadOlderMessages}
                        className="text-xs px-3 py-1 rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Load older messages
                      </button>
                    </div>
                  )}
                </div>
              ),
              Footer: () => {
                const filteredRecs = recommendations.filter(rec =>
                  rec.status === 'pending' && (
                    (selectedUserId && (rec.senderId === selectedUserId || rec.receiverId === selectedUserId)) ||
                    (selectedGroupId && (rec.senderId === userData?.id || rec.receiverId === userData?.id))
                  )
                );
                if (filteredRecs.length === 0) return <div className="pb-2" />;
                return (
                  <div className="px-3 md:px-4 pb-2 space-y-3">
                    {filteredRecs.map((recommendation) => {
                      const isOwn = recommendation.senderId === userData?.id;
                      return (
                        <div key={recommendation.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <ProfileRecommendationBubble
                            recommendation={recommendation}
                            isOwn={isOwn}
                            onAccept={handleAcceptRecommendation}
                            onReject={handleRejectRecommendation}
                            onDelete={handleDeleteRecommendation}
                            isProcessing={processingRecommendation === recommendation.id}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              },
            }}
            itemContent={(index, message) => {
              const isOwn = message.senderId === userData?.id;
              const isSystem = message.senderId === 'system';
              let senderName = 'Unknown';
              let senderAvatar = '';

              if (isSystem) {
                senderName = 'System';
                senderAvatar = '';
              } else if (isOwn) {
                senderName = userData?.username || 'You';
                senderAvatar = userData?.avatar || '';
              } else if (isGroupChat) {
                senderName = message.senderId;
                senderAvatar = '';
              } else {
                senderName = selectedUser?.username || 'Unknown';
                senderAvatar = selectedUser?.avatar || '';
              }

              const isSearchResult = searchResults.some(result => result.id === message.id);
              const isCurrentSearchResult = searchResults[currentSearchIndex]?.id === message.id;

              return (
                <div className="px-3 md:px-4 py-1.5 md:py-2">
                  <MessageBubble
                    message={message}
                    isOwn={isOwn}
                    senderName={senderName}
                    senderAvatar={senderAvatar}
                    onEdit={isGroupChat ? editGroupMessage : editMessage}
                    onDelete={isGroupChat ? deleteGroupMessage : deleteMessage}
                    onReply={handleReply}
                    onForward={handleForward}
                    onRetry={retryMessage}
                    searchQuery={searchQuery}
                    isSearchResult={isSearchResult}
                    isCurrentSearchResult={isCurrentSearchResult}
                  />
                </div>
              );
            }}
          />
        )}
      </div>

      {/* Typing indicator */}
      {isOtherUserTyping && !isGroupChat && (
        <div className="flex-shrink-0 px-4 py-1">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selectedUser?.username || 'User'} is typing...
            </span>
          </div>
        </div>
      )}

      {/* Message Input - Fixed */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          onFileUpload={handleFileUpload}
          onMultipleFileUpload={handleMultipleFileUpload}
          onSendVoiceMessage={handleSendVoiceMessage}
          onTyping={handleTyping}
          disabled={false}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          enableGlobalTyping={!!(selectedUserId || selectedGroupId)}
        />
      </div>

      {/* Chat Info Modal */}
      {(selectedUser || selectedGroup) && (
        <ChatInfoModal
          isOpen={isChatInfoOpen}
          onClose={() => setIsChatInfoOpen(false)}
          user={selectedUser ? {
            username: selectedUser.username,
            email: selectedUser.email,
            avatar: selectedUser.avatar,
          } : {
            username: selectedGroup!.groupName,
            email: `${selectedGroup!.memberCount} members`,
            avatar: selectedGroup!.groupAvatar,
          }}
          messages={messages}
          currentUserId={userData?.id || ''}
          lastMessageTime={selectedUser?.lastMessageTime || selectedGroup?.lastMessageTime}
        />
      )}

      {/* Forward Message Modal */}
      <ForwardMessageModal
        isOpen={!!forwardingMessage}
        onClose={handleCancelForward}
        message={forwardingMessage}
        conversations={[...conversations, ...groupConversations.map(gc => ({
          id: gc.groupId,
          userId: gc.groupId,
          username: gc.groupName,
          email: `${gc.memberCount} members`,
          avatar: gc.groupAvatar,
          lastMessage: gc.lastMessage,
          lastMessageTime: gc.lastMessageTime,
          lastMessageSeen: gc.lastMessageSeen,
          unreadCount: gc.unreadCount,
          isOnline: false
        }))]}
        currentUserId={userData?.id || ''}
        onForward={handleForwardMessage}
      />

      {/* Add Members Modal */}
      {selectedGroup && (
        <AddMembersModal
          isOpen={isAddMembersOpen}
          onClose={() => setIsAddMembersOpen(false)}
          groupId={selectedGroupId!}
          currentMembers={[]} // TODO: Get current members from group data
          onMembersAdded={handleMembersAdded}
        />
      )}

      {/* Hard Hide Confirmation Modal */}
      {showHardHideConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Hard Hide Chat</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                This will <strong>hard hide</strong> the conversation, removing it from both chat list and archived list.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Lock size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Warning:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Chat will be completely removed from all lists</li>
                      <li>Password required to access and unhide</li>
                      <li>Click your profile avatar 5 times to access</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelHardHide}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmHardHide}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                Hard Hide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Expiration Input Modal */}
      <MessageExpirationInput
        isOpen={isExpirationSelectorOpen}
        onClose={() => setIsExpirationSelectorOpen(false)}
        onSaveExpiration={handleExpirationSelect}
        currentExpiration={currentExpiration}
      />
    </div>
  );
};
