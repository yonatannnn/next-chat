import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { NotificationSettings } from '@/components/ui/NotificationSettings';
import { CreateGroupModal } from '@/components/ui/CreateGroupModal';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useConversations } from '@/features/chat/hooks/useConversations';
import { useGroupConversations } from '@/features/chat/hooks/useGroupConversations';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { LogOut, MessageCircle, Settings, Search, X, Bell, Users, Plus } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const { selectedUserId, selectedGroupId, setSelectedUserId, setSelectedGroupId, addConversation } = useChatStore();
  const { userData, logout } = useAuthStore();
  const { conversations, searchUsers, markAsRead, markAsSeen } = useConversations(userData?.id || '');
  const { groupConversations, markGroupAsRead, markGroupAsSeen } = useGroupConversations(userData?.id || '');
  const { allStatuses } = useOnlineStatus(userData?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats');
  const [isNavigatingToSettings, setIsNavigatingToSettings] = useState(false);

  const handleSettingsNavigation = async () => {
    setIsNavigatingToSettings(true);
    try {
      await router.push('/profile');
      // Reset loading state after navigation
      setTimeout(() => {
        setIsNavigatingToSettings(false);
      }, 500);
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigatingToSettings(false);
    }
  };

  // Reset loading state when component unmounts or after a delay
  useEffect(() => {
    if (isNavigatingToSettings) {
      const timer = setTimeout(() => {
        setIsNavigatingToSettings(false);
      }, 3000); // Reset after 3 seconds as fallback
      
      return () => clearTimeout(timer);
    }
  }, [isNavigatingToSettings]);

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
    setSelectedGroupId(null); // Clear group selection
    
    // Check if this is a search result (not in conversations yet)
    const isSearchResult = searchResults.find(user => user.userId === userId);
    if (isSearchResult) {
      // Add the user to conversations if they're not already there
      addConversation(isSearchResult);
    }
    
    // Only mark as seen if there are unread messages
    const conversation = conversations.find(conv => conv.userId === userId);
    if (conversation && conversation.unreadCount > 0) {
      markAsSeen(userId);
    }
    setSearchQuery('');
    setSearchResults([]);
    
    // On mobile, this will trigger the sidebar to hide and chat to show
    // The parent component handles the layout switching
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedUserId(null); // Clear user selection
    
    // Only mark as seen if there are unread messages
    const groupConversation = groupConversations.find(conv => conv.groupId === groupId);
    if (groupConversation && groupConversation.unreadCount > 0) {
      markGroupAsSeen(groupId);
    }
    
    // On mobile, this will trigger the sidebar to hide and chat to show
    // The parent component handles the layout switching
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

  const displayList = searchQuery.trim() ? searchResults : (activeTab === 'chats' ? conversations : groupConversations);

  return (
    <div className="w-full bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-3 md:p-4 border-b border-gray-200">
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
                onClick={() => setIsNotificationSettingsOpen(true)}
                className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Notification Settings"
              >
                <Bell size={18} className="md:w-5 md:h-5" />
              </button>
              <button
                onClick={handleSettingsNavigation}
                disabled={isNavigatingToSettings}
                className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                title="Profile Settings"
              >
                {isNavigatingToSettings ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                ) : (
                  <Settings size={18} className="md:w-5 md:h-5" />
                )}
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

      {/* Tab Navigation */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'chats'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MessageCircle size={16} />
            <span>Chats</span>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'groups'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users size={16} />
            <span>Groups</span>
          </button>
        </div>
      </div>

      {/* Search - Fixed */}
      <div className="flex-shrink-0 p-3 md:p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder={activeTab === 'chats' ? "Search users..." : "Search groups..."}
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
          {activeTab === 'groups' && (
            <button
              onClick={() => setIsCreateGroupOpen(true)}
              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              title="Create Group"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Users List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-3 md:p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            {searchQuery.trim() ? 'Search Results' : (activeTab === 'chats' ? 'Conversations' : 'Groups')}
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
                  {searchQuery.trim() 
                    ? (activeTab === 'chats' ? 'No users found' : 'No groups found')
                    : (activeTab === 'chats' ? 'No conversations yet' : 'No groups yet')
                  }
                </p>
                {activeTab === 'groups' && !searchQuery.trim() && (
                  <button
                    onClick={() => setIsCreateGroupOpen(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Create your first group
                  </button>
                )}
              </div>
            ) : (
              displayList.map((item) => {
                const isGroup = activeTab === 'groups';
                const isSelected = isGroup ? selectedGroupId === item.groupId : selectedUserId === item.userId;
                
                return (
                  <button
                    key={isGroup ? item.groupId : item.userId}
                    onClick={() => isGroup ? handleGroupSelect(item.groupId) : handleUserSelect(item.userId)}
                    className={`w-full flex items-center space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar
                        src={isGroup ? item.groupAvatar : item.avatar}
                        alt={isGroup ? item.groupName : item.username}
                        size="sm"
                        className="md:w-10 md:h-10"
                      />
                      {/* Online status indicator for users only */}
                      {!isGroup && allStatuses[item.userId]?.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium text-sm md:text-base ${item.unreadCount > 0 ? 'font-bold' : 'font-normal'} text-gray-900 truncate`}>
                          {isGroup ? item.groupName : item.username}
                        </h4>
                        {item.lastMessageTime && (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatTime(item.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      {item.lastMessage && (
                        <p className={`text-xs md:text-sm text-gray-500 truncate ${
                          item.lastMessage.startsWith('Me: ') || item.lastMessageSeen ? 'font-normal' : 'font-bold'
                        }`}>
                          {item.lastMessage}
                        </p>
                      )}
                      {isGroup && (
                        <p className="text-xs text-gray-400 mt-1">
                          {item.memberCount} member{item.memberCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    {isGroup ? (
                      <Users size={14} className="text-gray-400 flex-shrink-0 md:w-4 md:h-4" />
                    ) : (
                      <MessageCircle size={14} className="text-gray-400 flex-shrink-0 md:w-4 md:h-4" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={isNotificationSettingsOpen}
        onClose={() => setIsNotificationSettingsOpen(false)}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
      />
    </div>
  );
};
