'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatWindow } from '@/components/layout/ChatWindow';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useGlobalNotifications } from '@/hooks/useGlobalNotifications';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Menu, X } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const router = useRouter();
  const { user, userData, isLoading } = useAuth();
  const { users } = useUsers(userData?.id || '');
  const { selectedUserId, conversations, setSelectedUserId } = useChatStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Start with sidebar open on mobile
  
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
      if (selectedUserId) {
        setIsSidebarOpen(false); // Hide sidebar when chat is selected
      } else {
        setIsSidebarOpen(true); // Show sidebar when no chat is selected
      }
    }
  }, [selectedUserId]);

  // Handle browser back button on mobile
  useEffect(() => {
    const handlePopState = () => {
      if (window.innerWidth < 768 && selectedUserId) {
        setSelectedUserId(null);
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedUserId, setSelectedUserId]);

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
        {selectedUserId ? (
          // Chat mode: Show back button and user info
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Back button clicked - current user:', user, 'selectedUserId:', selectedUserId);
                setSelectedUserId(null);
                setIsSidebarOpen(true);
              }}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <X size={20} />
            </button>
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {conversations.find(user => user.userId === selectedUserId)?.username || 'Chat'}
              </h1>
            </div>
            <div className="w-8" /> {/* Spacer for centering */}
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
      {isSidebarOpen && !selectedUserId && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Chat Window - Mobile: Show when chat is selected, hide when sidebar is shown */}
      <div className={`
        flex-1 flex flex-col pt-16 md:pt-0 h-full md:h-screen
        ${selectedUserId ? 'block' : 'hidden md:flex'}
      `}>
        <ChatWindow />
      </div>
    </div>
  );
}
