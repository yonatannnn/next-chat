import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useConversations } from '@/features/chat/hooks/useConversations';
import { LogOut, MessageCircle, Settings, Search, X } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const { selectedUserId, setSelectedUserId } = useChatStore();
  const { userData, logout } = useAuthStore();
  const { conversations, searchUsers, markAsRead, markAsSeen } = useConversations(userData?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      const results = await searchUsers(query);
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    // Only mark as seen if there are unread messages
    const conversation = conversations.find(conv => conv.userId === userId);
    if (conversation && conversation.unreadCount > 0) {
      markAsSeen(userId);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const displayList = searchQuery.trim() ? searchResults : conversations;

  return (
    <div className="w-full bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <Avatar
                src={userData?.avatar}
                alt={userData?.username || 'User'}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-gray-900 truncate">{userData?.username}</h2>
              </div>
            </div>
            <div className="flex items-center space-x-1 md:space-x-2">
              <button
                onClick={() => router.push('/profile')}
                className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Profile Settings"
              >
                <Settings size={18} className="md:w-5 md:h-5" />
              </button>
              <button
                onClick={logout}
                className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Logout"
              >
                <LogOut size={18} className="md:w-5 md:h-5" />
              </button>
            </div>
          </div>
      </div>

      {/* Search */}
      <div className="p-3 md:p-4 border-b border-gray-200">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 md:p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            {searchQuery.trim() ? 'Search Results' : 'Conversations'}
          </h3>
          <div className="space-y-1 md:space-y-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-6 md:py-8">
                <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-500 text-sm">Searching...</span>
              </div>
            ) : displayList.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <p className="text-gray-500 text-sm">
                  {searchQuery.trim() ? 'No users found' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              displayList.map((user) => (
                <button
                  key={user.userId}
                  onClick={() => handleUserSelect(user.userId)}
                  className={`w-full flex items-center space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg transition-colors ${
                    selectedUserId === user.userId
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={user.avatar}
                      alt={user.username}
                      size="sm"
                      className="md:w-10 md:h-10"
                    />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium text-sm md:text-base ${user.unreadCount > 0 ? 'font-bold' : 'font-normal'} text-gray-900 truncate`}>
                        {user.username}
                      </h4>
                      {user.lastMessageTime && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTime(user.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    {user.lastMessage && (
                      <p className="text-xs md:text-sm text-gray-500 truncate">
                        {user.lastMessage}
                      </p>
                    )}
                  </div>
                  <MessageCircle size={14} className="text-gray-400 flex-shrink-0 md:w-4 md:h-4" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
