'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatWindow } from '@/components/layout/ChatWindow';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useChatStore } from '@/features/chat/store/chatStore';
import { Menu, X } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const router = useRouter();
  const { user, userData, isLoading } = useAuth();
  const { users } = useUsers(userData?.id || '');
  const { selectedUserId } = useChatStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Close sidebar when a chat is selected on mobile
  useEffect(() => {
    if (selectedUserId && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [selectedUserId]);

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
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-gray-600 hover:text-gray-900"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Chat</h1>
        <div className="w-8" /> {/* Spacer for centering */}
      </div>

      {/* Sidebar */}
      <div className={`
        fixed md:relative md:block z-40 h-full w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full pt-16 md:pt-0">
          <Sidebar />
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Chat Window */}
      <div className="flex-1 flex flex-col pt-16 md:pt-0">
        <ChatWindow />
      </div>
    </div>
  );
}
