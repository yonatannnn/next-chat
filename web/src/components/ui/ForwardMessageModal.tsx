import React, { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Message, Conversation } from '@/features/chat/store/chatStore';
import { X, Search, Forward } from 'lucide-react';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  conversations: Conversation[];
  currentUserId: string;
  onForward: (message: Message, recipientIds: string[]) => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  message,
  conversations,
  currentUserId,
  onForward,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv => 
    conv.userId !== currentUserId && 
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRecipientToggle = (userId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleForward = async () => {
    if (!message || selectedRecipients.length === 0) return;
    
    setIsForwarding(true);
    try {
      await onForward(message, selectedRecipients);
      onClose();
      setSelectedRecipients([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Error forwarding message:', error);
    } finally {
      setIsForwarding(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedRecipients([]);
    setSearchQuery('');
  };

  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Forward size={20} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Forward Message</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600 mb-2">Forwarding:</div>
          <div className="bg-white p-3 rounded-lg border">
            <div className="text-sm text-gray-900 line-clamp-3">
              {message.text}
            </div>
            {message.fileUrl && (
              <div className="mt-2 text-xs text-blue-600">📎 Attachment</div>
            )}
            {message.fileUrls && message.fileUrls.length > 0 && (
              <div className="mt-2 text-xs text-blue-600">
                📎 {message.fileUrls.length} attachments
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                {searchQuery ? 'No contacts found' : 'No contacts available'}
              </div>
            ) : (
              filteredConversations.map((contact) => (
                <div
                  key={contact.userId}
                  onClick={() => handleRecipientToggle(contact.userId)}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedRecipients.includes(contact.userId)
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Avatar
                    src={contact.avatar}
                    alt={contact.username}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {contact.username}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {contact.email}
                    </div>
                  </div>
                  {selectedRecipients.includes(contact.userId) && (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleClose}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleForward}
                disabled={selectedRecipients.length === 0 || isForwarding}
                isLoading={isForwarding}
                size="sm"
              >
                Forward
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
