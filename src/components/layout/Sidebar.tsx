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
import { LogOut, MessageCircle, Settings, Search, X, Bell, Users, Plus, Eye, EyeOff, Archive, AlertTriangle, Lock } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const { selectedUserId, selectedGroupId, setSelectedUserId, setSelectedGroupId, addConversation, hideConversation, unhideConversation, hardHideConversation, unhideHardHiddenConversation, updateConversationsPreservingStates } = useChatStore();
  const { userData, logout } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };
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
  const [showHidden, setShowHidden] = useState(false);
  const [avatarClickCount, setAvatarClickCount] = useState(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [showHardHiddenChats, setShowHardHiddenChats] = useState(false);

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


  const handleAvatarClick = () => {
    setAvatarClickCount(prev => prev + 1);
    
    if (avatarClickCount >= 4) { // 5 clicks total (0-indexed)
      setShowPasswordDialog(true);
      setAvatarClickCount(0);
    }
  };

  const handlePasswordSubmit = () => {
    // Simple password check - you can make this more secure
    if (password === 'unhide123') {
      setShowHardHiddenChats(true);
      setShowPasswordDialog(false);
      setPassword('');
    } else {
      alert('Incorrect password!');
      setPassword('');
    }
  };

  const handleUnhideHardHidden = (userId: string) => {
    unhideHardHiddenConversation(userId);
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

  // Filter conversations based on hidden status (exclude hard-hidden from both lists)
  const filteredConversations = showHidden 
    ? conversations.filter(conv => !conv.hardHidden) // Show hidden but not hard-hidden
    : conversations.filter(conv => !conv.hidden && !conv.hardHidden); // Show normal chats only
  
  // Get hard-hidden conversations separately
  const hardHiddenConversations = conversations.filter(conv => conv.hardHidden);
  
  const displayList = searchQuery.trim() ? searchResults : (activeTab === 'chats' ? filteredConversations : groupConversations);

  return (
    <div className="w-full bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-3 md:p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <button
                onClick={handleAvatarClick}
                className="flex-shrink-0 hover:opacity-80 transition-opacity"
                title="Click setting icon"
              >
                <Avatar
                  src={userData?.avatar}
                  alt={userData?.username || 'User'}
                  size="md"
                />
              </button>
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
                onClick={handleLogoutClick}
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500">
              {searchQuery.trim() ? 'Search Results' : (activeTab === 'chats' ? 'Conversations' : 'Groups')}
            </h3>
            {activeTab === 'chats' && !searchQuery.trim() && (
              <button
                onClick={() => setShowHidden(!showHidden)}
                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                title={showHidden ? 'Hide archived chats' : 'Show archived chats'}
              >
                {showHidden ? <EyeOff size={14} /> : <Archive size={14} />}
                <span>{showHidden ? 'Hide' : 'Archived'}</span>
              </button>
            )}
          </div>
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
                  <div
                    key={isGroup ? item.groupId : item.userId}
                    className={`group relative w-full flex items-center space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => isGroup ? handleGroupSelect(item.groupId) : handleUserSelect(item.userId)}
                      className="flex-1 flex items-center space-x-2 md:space-x-3 min-w-0"
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
                    
                  </div>
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


      {/* Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-full">
                <Lock size={24} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Access Hard-Hidden Chats</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Enter password to access hard-hidden conversations:
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPassword('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hard-Hidden Chats Section */}
      {showHardHiddenChats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 p-2 rounded-full">
                  <Lock size={24} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Hard-Hidden Chats</h3>
              </div>
              <button
                onClick={() => setShowHardHiddenChats(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600">
                These conversations are hard-hidden and require password access to unhide.
              </p>
            </div>
            
            {hardHiddenConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Lock size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No hard-hidden conversations found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {hardHiddenConversations.map((conv) => (
                  <div
                    key={conv.userId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar
                        src={conv.avatar}
                        alt={conv.username}
                        size="sm"
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{conv.username}</h4>
                        <p className="text-sm text-gray-500">{conv.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnhideHardHidden(conv.userId)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Unhide
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <LogOut className="h-6 w-6 text-red-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirm Logout
                  </h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  Are you sure you want to logout? You'll need to sign in again to access your chats.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleLogoutCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
