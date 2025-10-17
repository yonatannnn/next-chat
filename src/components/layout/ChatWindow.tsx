import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useRecommendations } from '@/features/profile/hooks/useRecommendations';
import { Trash2, Info, Users, Search, X, ChevronUp, ChevronDown, EyeOff, Lock, AlertTriangle } from 'lucide-react';

interface ChatWindowProps {
  isMobileSearchOpen?: boolean;
  setIsMobileSearchOpen?: (open: boolean) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  isMobileSearchOpen = false, 
  setIsMobileSearchOpen 
}) => {
  const router = useRouter();
  const { selectedUserId, selectedGroupId, messages, conversations, groupConversations, setSelectedUserId, setSelectedGroupId, replyingTo, setReplyingTo, forwardingMessage, setForwardingMessage, markMessageAsSeen, updateConversation, updateGroupConversation, hideConversation, hardHideConversation } = useChatStore();
  const { userData } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { markAsRead, markAsSeen } = useConversations(userData?.id || '');
  const { markGroupAsRead, markGroupAsSeen } = useGroupConversations(userData?.id || '');
  const { recommendations, acceptRecommendation, rejectRecommendation, deleteRecommendation } = useRecommendations(userData?.id || '');
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [processingRecommendation, setProcessingRecommendation] = useState<string | null>(null);
  const [showHardHideConfirm, setShowHardHideConfirm] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Handle mobile search state
  useEffect(() => {
    if (isMobileSearchOpen && setIsMobileSearchOpen) {
      setIsSearchOpen(true);
      setIsMobileSearchOpen(false); // Reset mobile state
    }
  }, [isMobileSearchOpen, setIsMobileSearchOpen]);

  // Track if user has manually scrolled away from bottom
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  // Track if user is actively scrolling to prevent interference
  const [isUserActivelyScrolling, setIsUserActivelyScrolling] = useState(false);
  // Track previous chat to only reset scroll when actually switching chats
  const [previousChatId, setPreviousChatId] = useState<string | null>(null);

  // Simple scroll detection - only track if user is at bottom
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Mark that user is actively scrolling
      setIsUserActivelyScrolling(true);
      clearTimeout(scrollTimeout);
      
      const currentScrollTop = messagesContainer.scrollTop;
      const scrollHeight = messagesContainer.scrollHeight;
      const clientHeight = messagesContainer.clientHeight;
      
      // Check if user is at the bottom (within 5px for more precision)
      const atBottom = currentScrollTop + clientHeight >= scrollHeight - 5;
      setIsAtBottom(atBottom);
      
      // If user scrolls up from bottom, mark that they've manually scrolled
      if (!atBottom) {
        setUserHasScrolledUp(true);
      } else {
        // If they scroll back to bottom, reset the flag
        setUserHasScrolledUp(false);
      }

      // Reset active scrolling flag after scroll ends
      scrollTimeout = setTimeout(() => {
        setIsUserActivelyScrolling(false);
      }, 150);
    };

    // Initial check
    handleScroll();

    messagesContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      messagesContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

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
      setTimeout(() => {
        const firstMessage = filteredMessages[0];
        const messageElement = document.querySelector(`[data-message-id="${firstMessage.id}"]`);
        if (messageElement) {
          messageElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
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
    setTimeout(() => {
      const currentMessage = searchResults[newIndex];
      if (currentMessage) {
        const messageElement = document.querySelector(`[data-message-id="${currentMessage.id}"]`);
        if (messageElement) {
          messageElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }
    }, 100);
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
      setTimeout(() => {
        const messageElement = document.querySelector(`[data-message-id="${currentResult.id}"]`);
        if (messageElement) {
          messageElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
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
  const [smoothScrollingEnabled, setSmoothScrollingEnabled] = useState(false);

  const { sendMessage, editMessage, deleteMessage, deleteAllMessages, forwardMessage, sendVoiceMessage } = useChat(userData?.id || '', selectedUserId);
  const { sendMessage: sendGroupMessage, editMessage: editGroupMessage, deleteMessage: deleteGroupMessage, sendVoiceMessage: sendGroupVoiceMessage } = useGroupChat(userData?.id || '', selectedGroupId);

  const selectedUser = conversations.find(user => user.userId === selectedUserId);
  const selectedGroup = groupConversations.find(group => group.groupId === selectedGroupId);
  const isGroupChat = !!selectedGroupId;

  useEffect(() => {
    if (messagesEndRef.current) {
      // On initial load or when switching chats, scroll instantly to bottom (unless search is active)
      if ((isInitialLoad || messages.length === 0) && !isSearchOpen) {
        // Use direct scrollTop manipulation for better mobile compatibility
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        setIsInitialLoad(false);
        
        // After 1 second, enable smooth scrolling for future messages
        setTimeout(() => {
          setSmoothScrollingEnabled(true);
        }, 200);
      } 
      // When new messages are added, only auto-scroll if user is at the bottom AND hasn't manually scrolled up AND not actively scrolling
      else if (messages.length > previousMessageCount && !isSearchOpen) {
        // Only auto-scroll if user is at the bottom AND hasn't manually scrolled up AND not actively scrolling
        if (isAtBottom && !userHasScrolledUp && !isUserActivelyScrolling) {
          // Use direct scrollTop manipulation for better mobile compatibility
          const messagesContainer = document.querySelector('.messages-container');
          if (messagesContainer) {
            if (smoothScrollingEnabled) {
              messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
              });
            } else {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          }
        }
      }
      setPreviousMessageCount(messages.length);
    }
  }, [messages, isInitialLoad, previousMessageCount, smoothScrollingEnabled, isSearchOpen, isAtBottom, userHasScrolledUp, isUserActivelyScrolling]);

  useEffect(() => {
    if (selectedUserId || selectedGroupId) {
      // Get current chat ID
      const currentChatId = selectedUserId || selectedGroupId;
      
      // Only reset scroll state when actually switching to a different chat
      if (currentChatId !== previousChatId) {
        console.log('Switching to different chat:', currentChatId, 'from:', previousChatId);
        // Reset initial load state when switching chats
        setIsInitialLoad(true);
        setUserHasScrolledUp(false); // Reset scroll flag when switching chats
        setIsUserActivelyScrolling(false); // Reset active scrolling flag
        setPreviousMessageCount(0);
        setSmoothScrollingEnabled(false);
        
        // Update previous chat ID
        setPreviousChatId(currentChatId);
      } else {
        console.log('Same chat, not resetting scroll state');
      }
      
      // Only mark as seen if there are unread messages
      if (selectedUserId) {
        const conversation = conversations.find(conv => conv.userId === selectedUserId);
        if (conversation && conversation.unreadCount > 0) {
          markAsSeen(selectedUserId);
        }
      } else if (selectedGroupId) {
        const groupConversation = groupConversations.find(conv => conv.groupId === selectedGroupId);
        if (groupConversation && groupConversation.unreadCount > 0) {
          markGroupAsSeen(selectedGroupId);
        }
      }
    }
  }, [selectedUserId, selectedGroupId, previousChatId, conversations, groupConversations, markAsSeen, markGroupAsSeen]);

  // PWA visibility detection for message seen status
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only process if we're in PWA mode and page becomes visible
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone === true;
      
      if (isPWA && document.visibilityState === 'visible' && 
          (selectedUserId || selectedGroupId) && userData?.id && messages.length > 0) {
        console.log('PWA became visible, checking for unseen messages...');
        
        // Small delay to ensure user is actually viewing the chat
        setTimeout(() => {
          if (selectedUserId) {
            const unseenMessages = messages.filter(msg => 
              msg.senderId === selectedUserId && 
              msg.receiverId === userData.id && 
              !msg.seen
            );

            if (unseenMessages.length > 0) {
              console.log(`PWA visibility: Marking ${unseenMessages.length} messages as seen for user ${selectedUserId}`);
              
              unseenMessages.forEach(async (message) => {
                try {
                  await chatService.markMessageAsSeen(message.id);
                  markMessageAsSeen(message.id);
                  updateConversation(selectedUserId, { lastMessageSeen: true });
                } catch (error) {
                  console.error('Error marking message as seen:', error);
                }
              });
            }
          } else if (selectedGroupId) {
            const unseenMessages = messages.filter(msg => 
              msg.groupId === selectedGroupId && 
              msg.senderId !== userData.id && 
              !msg.seen
            );

            if (unseenMessages.length > 0) {
              console.log(`PWA visibility: Marking ${unseenMessages.length} group messages as seen for group ${selectedGroupId}`);
              
              unseenMessages.forEach(async (message) => {
                try {
                  await groupChatService.markGroupMessageAsSeen(message.id);
                  markMessageAsSeen(message.id);
                  updateGroupConversation(selectedGroupId, { lastMessageSeen: true });
                } catch (error) {
                  console.error('Error marking group message as seen:', error);
                }
              });
            }
          }
        }, 500); // Shorter delay for PWA visibility
      }
    };

    // Listen for visibility changes (important for PWA)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also listen for focus events (additional PWA detection)
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        handleVisibilityChange();
      }
    };
    window.addEventListener('focus', handleFocus);

    // Additional PWA-specific detection: listen for app state changes
    const handleAppStateChange = () => {
      // This helps detect when the PWA app becomes active again
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        handleVisibilityChange();
      }
    };
    
    // Listen for when the app becomes active (useful for PWA)
    window.addEventListener('pageshow', handleAppStateChange);
    window.addEventListener('resume', handleAppStateChange); // Some browsers support this

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleAppStateChange);
      window.removeEventListener('resume', handleAppStateChange);
    };
  }, [selectedUserId, selectedGroupId, messages, userData?.id, markMessageAsSeen, updateConversation, updateGroupConversation]);

  // Simplified message seen logic - mark as seen when chat is selected and messages are loaded
  useEffect(() => {
    if ((selectedUserId || selectedGroupId) && userData?.id && messages.length > 0) {
      // Add a small delay to ensure user is actually viewing the chat
      const markAsSeenTimeout = setTimeout(() => {
        if (selectedUserId) {
          // Find messages sent TO the current user (incoming messages) that haven't been seen yet
          const unseenMessages = messages.filter(msg => 
            msg.senderId === selectedUserId && 
            msg.receiverId === userData.id && 
            !msg.seen
          );

          // Only mark as seen if there are actually unseen messages
          if (unseenMessages.length > 0) {
            console.log(`Marking ${unseenMessages.length} messages as seen for user ${selectedUserId}`);
            
            // Mark each unseen incoming message as seen
            unseenMessages.forEach(async (message) => {
              try {
                await chatService.markMessageAsSeen(message.id);
                markMessageAsSeen(message.id);
                
                // Update the conversation's lastMessageSeen status
                updateConversation(selectedUserId, { lastMessageSeen: true });
              } catch (error) {
                console.error('Error marking message as seen:', error);
              }
            });
          }
        } else if (selectedGroupId) {
          // For group messages, mark messages from other users as seen
          const unseenMessages = messages.filter(msg => 
            msg.groupId === selectedGroupId && 
            msg.senderId !== userData.id && 
            !msg.seen
          );

          // Only mark as seen if there are actually unseen messages
          if (unseenMessages.length > 0) {
            console.log(`Marking ${unseenMessages.length} group messages as seen for group ${selectedGroupId}`);
            
            // Mark each unseen group message as seen
            unseenMessages.forEach(async (message) => {
              try {
                await groupChatService.markGroupMessageAsSeen(message.id);
                markMessageAsSeen(message.id);
                
                // Update the group conversation's lastMessageSeen status
                updateGroupConversation(selectedGroupId, { lastMessageSeen: true });
              } catch (error) {
                console.error('Error marking group message as seen:', error);
              }
            });
          }
        }
      }, 1000); // 1 second delay to ensure user is viewing

      return () => clearTimeout(markAsSeenTimeout);
    }
  }, [selectedUserId, selectedGroupId, messages, userData?.id, markMessageAsSeen, updateConversation, updateGroupConversation]);


  const handleSendMessage = async (text: string, fileUrl?: string, fileUrls?: string[], replyTo?: any) => {
    if (selectedUserId) {
      await sendMessage(text, fileUrl, fileUrls, replyTo);
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
        await sendMessage("✅ Profile picture recommendation accepted.");
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
        await sendMessage("❌ Profile picture recommendation rejected.");
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

  const dropdownItems = [
    {
      id: 'search',
      label: 'Search Messages',
      icon: <Search size={16} />,
      onClick: () => setIsSearchOpen(true),
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
        label: 'Hide Chat',
        icon: <EyeOff size={16} />,
        onClick: handleHideChat,
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
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select a chat to start messaging
          </h3>
          <p className="text-gray-500 text-sm md:text-base">
            Choose a user or group from the sidebar to begin your conversation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Chat Header - Fixed - Hidden on mobile since mobile header shows this info */}
      <div className="hidden md:flex flex-shrink-0 border-b border-gray-200 p-3 md:p-4">
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
              <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                {isGroupChat ? selectedGroup?.groupName : selectedUser?.username}
              </h3>
              {isGroupChat && selectedGroup && (
                <p className="text-xs text-gray-500">
                  {selectedGroup.memberCount} member{selectedGroup.memberCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            <DropdownMenu items={dropdownItems} />
          </div>
        </div>
      </div>

      {/* Search Interface */}
      {isSearchOpen && (
        <div className="flex-shrink-0 border-b border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={closeSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-600">
                  {currentSearchIndex + 1} of {searchResults.length}
                </span>
                <button
                  onClick={() => navigateSearch('up')}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  disabled={searchResults.length === 0}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => navigateSearch('down')}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  disabled={searchResults.length === 0}
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages - Scrollable */}
      <div className="messages-container flex-1 overflow-y-auto min-h-0 p-3 md:p-4 space-y-3 md:space-y-4 pt-4 md:pt-4">
        {/* Messages */}
        {messages.map((message) => {
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
            // For group messages, we need to get the sender's name from the message or find it in the group members
            // For now, we'll use a placeholder - this would need to be enhanced with member data
            senderName = message.senderId; // This should be replaced with actual sender name lookup
            senderAvatar = '';
          } else {
            senderName = selectedUser?.username || 'Unknown';
            senderAvatar = selectedUser?.avatar || '';
          }
          
          const isSearchResult = searchResults.some(result => result.id === message.id);
          const isCurrentSearchResult = searchResults[currentSearchIndex]?.id === message.id;
          
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={isOwn}
              senderName={senderName}
              senderAvatar={senderAvatar}
              onEdit={isGroupChat ? editGroupMessage : editMessage}
              onDelete={isGroupChat ? deleteGroupMessage : deleteMessage}
              onReply={handleReply}
              onForward={handleForward}
              searchQuery={searchQuery}
              isSearchResult={isSearchResult}
              isCurrentSearchResult={isCurrentSearchResult}
            />
          );
        })}
        
        {/* Profile Recommendations - Show only pending recommendations */}
        {recommendations
          .filter(rec => 
            rec.status === 'pending' && (
              // For individual chats
              (selectedUserId && (rec.senderId === selectedUserId || rec.receiverId === selectedUserId)) ||
              // For group chats - show recommendations where current user is sender or receiver
              (selectedGroupId && (rec.senderId === userData?.id || rec.receiverId === userData?.id))
            )
          )
          .map((recommendation) => {
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
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Fixed */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          onFileUpload={handleFileUpload}
          onMultipleFileUpload={handleMultipleFileUpload}
          onSendVoiceMessage={handleSendVoiceMessage}
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
    </div>
  );
};
