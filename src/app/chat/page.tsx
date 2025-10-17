'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatWindow } from '@/components/layout/ChatWindow';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useChat } from '@/features/chat/hooks/useChat';
import { chatService } from '@/features/chat/services/chatService';
import { useGlobalNotifications } from '@/hooks/useGlobalNotifications';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Avatar } from '@/components/ui/Avatar';
import { ChatInfoModal } from '@/components/ui/ChatInfoModal';
import { MobileNotificationTest } from '@/components/ui/MobileNotificationTest';
import { MobilePushNotificationTest } from '@/components/ui/MobilePushNotificationTest';
import { Menu, X, Info, Users, Trash2, Search, EyeOff, Lock, AlertTriangle } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const router = useRouter();
  const { user, userData, isLoading } = useAuth();
  const { users } = useUsers(userData?.id || '');
  const { selectedUserId, selectedGroupId, conversations, groupConversations, setSelectedUserId, setSelectedGroupId, hideConversation, hardHideConversation } = useChatStore();
  const { messages } = useChat(userData?.id || '', selectedUserId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Start with sidebar open on mobile
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showHardHideConfirm, setShowHardHideConfirm] = useState(false);
  
  // Initialize online status tracking
  const { isOnline, allStatuses } = useOnlineStatus(userData?.id);
  
  // Initialize global notifications
  useGlobalNotifications();

  // Handle hide and hard hide functions
  const handleHideChat = () => {
    if (selectedUserId) {
      hideConversation(selectedUserId);
      setSelectedUserId(null);
      setIsSidebarOpen(true);
    }
  };

  const handleHardHideChat = () => {
    setShowHardHideConfirm(true);
  };

  const confirmHardHide = () => {
    if (selectedUserId) {
      hardHideConversation(selectedUserId);
      setSelectedUserId(null);
      setIsSidebarOpen(true);
      setShowHardHideConfirm(false);
    }
  };

  const cancelHardHide = () => {
    setShowHardHideConfirm(false);
  };

  const handleDeleteChat = async () => {
    if (selectedUserId && userData?.id && window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      try {
        // Delete all messages between the two users
        await chatService.deleteAllMessages(userData.id, selectedUserId);
        // Clear the selected user
        setSelectedUserId(null);
        setIsSidebarOpen(true);
      } catch (error) {
        console.error('Error deleting chat:', error);
        alert('Failed to delete chat. Please try again.');
      }
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      console.log('Redirecting to login - user:', user, 'isLoading:', isLoading);
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // On mobile: show sidebar by default, hide when chat is selected
  useEffect(() => {
    if (window.innerWidth < 768) {
      if (selectedUserId || selectedGroupId) {
        setIsSidebarOpen(false); // Hide sidebar when chat is selected
      } else {
        // Show sidebar when no chat is selected (including when back button is clicked)
        setIsSidebarOpen(true);
      }
    }
  }, [selectedUserId, selectedGroupId]);

  // Handle browser back button on mobile
  useEffect(() => {
    const handlePopState = () => {
      // Only handle if we're on mobile and have a selected chat
      if (window.innerWidth < 768 && (selectedUserId || selectedGroupId)) {
        console.log('Browser back button pressed - clearing selected chat');
        
        // Clear the selected chat to show sidebar
        setSelectedUserId(null);
        setSelectedGroupId(null);
        
        // Push a new state to prevent the browser from actually going back
        setTimeout(() => {
          window.history.pushState(null, '', window.location.pathname);
        }, 0);
      }
    };

    // Push initial state to handle back button properly
    if (window.innerWidth < 768) {
      window.history.pushState(null, '', window.location.pathname);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedUserId, selectedGroupId, setSelectedUserId, setSelectedGroupId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-50 relative overflow-hidden">
      {/* Mobile Notification Test - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50 max-w-sm space-y-2">
          <MobileNotificationTest />
          <MobilePushNotificationTest />
        </div>
      )}
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        {selectedUserId || selectedGroupId ? (
          // Chat mode: Show back button and chat info
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Back button clicked - current user:', user, 'selectedUserId:', selectedUserId, 'selectedGroupId:', selectedGroupId);
                // Clear selected chat - the useEffect will handle showing the sidebar
                setSelectedUserId(null);
                setSelectedGroupId(null);
              }}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <X size={20} />
            </button>
            <div 
              className="flex items-center space-x-2 min-w-0 flex-1 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Header area clicked - selectedUserId:', selectedUserId);
                if (selectedUserId) {
                  console.log('Navigating to friend profile (header click):', selectedUserId);
                  router.push(`/friend/${selectedUserId}`);
                }
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Header area touched - selectedUserId:', selectedUserId);
                if (selectedUserId) {
                  console.log('Navigating to friend profile (header touch):', selectedUserId);
                  router.push(`/friend/${selectedUserId}`);
                }
              }}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="flex-shrink-0">
                {(() => {
                  const selectedUser = conversations.find(user => user.userId === selectedUserId);
                  const selectedGroup = groupConversations.find(group => group.groupId === selectedGroupId);
                  
                  const avatarSrc = selectedUserId 
                    ? selectedUser?.avatar
                    : selectedGroup?.groupAvatar;
                  const altText = selectedUserId 
                    ? selectedUser?.username || 'User'
                    : selectedGroup?.groupName || 'Group';
                  
                  console.log('Avatar debug - selectedUserId:', selectedUserId, 'selectedUser:', selectedUser, 'avatarSrc:', avatarSrc, 'altText:', altText);
                  
                  return (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={altText}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log('Avatar image failed to load:', avatarSrc);
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-full h-full flex items-center justify-center text-gray-600 font-medium text-sm ${avatarSrc ? 'hidden' : 'flex'}`}
                        style={{ display: avatarSrc ? 'none' : 'flex' }}
                      >
                        {altText ? altText.charAt(0).toUpperCase() : 'U'}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {selectedUserId 
                  ? conversations.find(user => user.userId === selectedUserId)?.username || 'Chat'
                  : groupConversations.find(group => group.groupId === selectedGroupId)?.groupName || 'Group'
                }
              </h1>
            </div>
            <div className="flex-shrink-0 flex items-center space-x-2">
              <button
                onClick={() => {
                  console.log('Search button clicked on mobile');
                  setIsMobileSearchOpen(true);
                }}
                className="p-2 text-gray-600 hover:text-gray-900"
                title="Search Messages"
              >
                <Search size={20} />
              </button>
              <DropdownMenu items={[
                {
                  id: 'chat-info',
                  label: selectedGroupId ? 'Group Info' : 'Chat Info',
                  icon: <Info size={16} />,
                  onClick: () => {
                    console.log('Chat info clicked');
                    setIsChatInfoOpen(true);
                  },
                },
                ...(selectedGroupId ? [
                  {
                    id: 'add-members',
                    label: 'Add Members',
                    icon: <Users size={16} />,
                    onClick: () => {
                      console.log('Add members clicked');
                    },
                  },
                  {
                    id: 'delete-group',
                    label: 'Delete Group',
                    icon: <Trash2 size={16} />,
                    onClick: () => {
                      console.log('Delete group clicked');
                    },
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
              ]} />
            </div>
          </>
        ) : (
          // Sidebar mode: Show menu button and title
          <>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Chat</h1>
            <div className="w-8" /> {/* Spacer for centering */}
          </>
        )}
      </div>

      {/* Sidebar - Mobile: Show by default, hide when chat selected */}
      <div className={`
        fixed md:relative md:block z-40 w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        h-full md:h-screen
      `}>
        <div className="h-full pt-16 md:pt-0 flex flex-col">
          <Sidebar />
        </div>
      </div>

      {/* Overlay for mobile - only show when sidebar is open and no chat is selected */}
      {isSidebarOpen && !selectedUserId && !selectedGroupId && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Chat Window - Mobile: Show when chat is selected, hide when sidebar is shown */}
      <div className={`
        flex-1 flex flex-col pt-16 md:pt-0 h-full md:h-screen overflow-hidden
        ${(selectedUserId || selectedGroupId) ? 'block' : 'hidden md:flex'}
      `}>
        <ChatWindow 
          isMobileSearchOpen={isMobileSearchOpen}
          setIsMobileSearchOpen={setIsMobileSearchOpen}
        />
      </div>

      {/* Chat Info Modal */}
      {selectedUserId && (
        <ChatInfoModal
          isOpen={isChatInfoOpen}
          onClose={() => setIsChatInfoOpen(false)}
          user={{
            username: conversations.find(user => user.userId === selectedUserId)?.username || 'Unknown',
            email: conversations.find(user => user.userId === selectedUserId)?.email || '',
            avatar: conversations.find(user => user.userId === selectedUserId)?.avatar
          }}
          messages={messages}
          currentUserId={userData?.id || ''}
          lastMessageTime={messages.length > 0 ? messages[messages.length - 1]?.timestamp : undefined}
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
}
