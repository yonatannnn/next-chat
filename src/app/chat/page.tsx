'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatWindow } from '@/components/layout/ChatWindow';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useChat } from '@/features/chat/hooks/useChat';
import { useGlobalNotifications } from '@/hooks/useGlobalNotifications';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Avatar } from '@/components/ui/Avatar';
import { ChatInfoModal } from '@/components/ui/ChatInfoModal';
import { Menu, X, Info, Users, Trash2 } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const router = useRouter();
  const { user, userData, isLoading } = useAuth();
  const { users } = useUsers(userData?.id || '');
  const { selectedUserId, selectedGroupId, conversations, groupConversations, setSelectedUserId, setSelectedGroupId } = useChatStore();
  const { messages } = useChat(userData?.id || '', selectedUserId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Start with sidebar open on mobile
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  
  // Initialize online status tracking
  const { isOnline, allStatuses } = useOnlineStatus(userData?.id);
  
  // Initialize global notifications
  useGlobalNotifications();

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
      if (window.innerWidth < 768 && (selectedUserId || selectedGroupId)) {
        setSelectedUserId(null);
        setSelectedGroupId(null);
        setIsSidebarOpen(true);
      }
    };

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
    <div className="h-screen flex bg-gray-50 relative">
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
            <div className="flex-shrink-0">
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
                ] : [{
                  id: 'delete-chat',
                  label: 'Delete Chat',
                  icon: <Trash2 size={16} />,
                  onClick: () => {
                    console.log('Delete chat clicked');
                  },
                  variant: 'danger' as const,
                }]),
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
        flex-1 flex flex-col pt-16 md:pt-0 h-full md:h-screen
        ${(selectedUserId || selectedGroupId) ? 'block' : 'hidden md:flex'}
      `}>
        <ChatWindow />
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
    </div>
  );
}
