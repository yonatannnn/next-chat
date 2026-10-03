import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Search } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Avatar } from './Avatar';
import { groupChatService } from '@/features/chat/services/groupChatService';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUsers } from '@/features/users/hooks/useUsers';

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  currentMembers: Array<{ userId: string; username: string; email: string; avatar?: string }>;
  onMembersAdded: () => void;
}

export const AddMembersModal: React.FC<AddMembersModalProps> = ({ 
  isOpen, 
  onClose, 
  groupId, 
  currentMembers,
  onMembersAdded 
}) => {
  const { userData } = useAuthStore();
  const { users } = useUsers(userData?.id || '');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Array<{ userId: string; username: string; email: string; avatar?: string }>>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedMembers([]);
      setError(null);
    }
  }, [isOpen]);

  // Filter users who are not already members
  const filteredUsers = users.filter(user => 
    user.id !== userData?.id && // Exclude current user
    searchQuery.length > 0 &&
    user.username.toLowerCase() === searchQuery.toLowerCase() && // Exact match
    !currentMembers.find(member => member.userId === user.id) && // Not already a member
    !selectedMembers.find(member => member.userId === user.id) // Not already selected
  );

  const handleMemberSelect = (user: { id: string; username: string; email: string; avatar?: string }) => {
    setSelectedMembers(prev => [...prev, {
      userId: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar
    }]);
    setSearchQuery('');
  };

  const handleMemberRemove = (userId: string) => {
    setSelectedMembers(prev => prev.filter(member => member.userId !== userId));
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      setError('Please select at least one member to add');
      return;
    }

    if (!userData?.id) {
      setError('User not authenticated');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      // Add each selected member to the group
      for (const member of selectedMembers) {
        await groupChatService.addMemberToGroup(groupId, {
          userId: member.userId,
          username: member.username,
          email: member.email,
          avatar: member.avatar
        });
      }

      onMembersAdded();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add members');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Members</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Member Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Users
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="pl-10 w-full"
              />
            </div>
          </div>

          {/* Search Results */}
          {searchQuery && filteredUsers.length > 0 && (
            <div className="border border-gray-200 rounded-md max-h-32 overflow-y-auto">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleMemberSelect(user)}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 transition-colors"
                >
                  <Avatar
                    src={user.avatar}
                    alt={user.username}
                    size="sm"
                  />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{user.username}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <Plus size={16} className="text-blue-500" />
                </button>
              ))}
            </div>
          )}

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Members ({selectedMembers.length})
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md"
                  >
                    <Avatar
                      src={member.avatar}
                      alt={member.username}
                      size="sm"
                    />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{member.username}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                    <button
                      onClick={() => handleMemberRemove(member.userId)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddMembers}
            disabled={isAdding || selectedMembers.length === 0}
            className="flex items-center space-x-2"
          >
            {isAdding ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <Users size={16} />
                <span>Add Members</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
