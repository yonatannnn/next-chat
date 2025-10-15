import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ChatInfoModal } from '@/components/ui/ChatInfoModal';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useChat } from '@/features/chat/hooks/useChat';
import { useConversations } from '@/features/chat/hooks/useConversations';
import { supabase } from '@/lib/supabase';
import { ForwardMessageModal } from '@/components/ui/ForwardMessageModal';
import { Trash2, Info } from 'lucide-react';

export const ChatWindow: React.FC = () => {
  const router = useRouter();
  const { selectedUserId, messages, conversations, setSelectedUserId, replyingTo, setReplyingTo, forwardingMessage, setForwardingMessage } = useChatStore();
  const { userData } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { markAsRead, markAsSeen } = useConversations(userData?.id || '');
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);

  const { sendMessage, editMessage, deleteMessage, deleteAllMessages, forwardMessage } = useChat(userData?.id || '', selectedUserId);

  const selectedUser = conversations.find(user => user.userId === selectedUserId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      // Only mark as seen if there are unread messages
      const conversation = conversations.find(conv => conv.userId === selectedUserId);
      if (conversation && conversation.unreadCount > 0) {
        markAsSeen(selectedUserId);
      }
    }
  }, [selectedUserId, conversations, markAsSeen]);

  const handleSendMessage = async (text: string, fileUrl?: string, fileUrls?: string[], replyTo?: any) => {
    if (!selectedUserId) return;
    await sendMessage(text, fileUrl, fileUrls, replyTo);
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

  const dropdownItems = [
    {
      id: 'chat-info',
      label: 'Chat Info',
      icon: <Info size={16} />,
      onClick: handleChatInfo,
    },
    {
      id: 'delete-chat',
      label: 'Delete Chat',
      icon: <Trash2 size={16} />,
      onClick: handleDeleteChat,
      variant: 'danger' as const,
    },
  ];

  if (!selectedUserId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select a chat to start messaging
          </h3>
          <p className="text-gray-500 text-sm md:text-base">
            Choose a user from the sidebar to begin your conversation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Chat Header - Fixed */}
      <div className="flex-shrink-0 border-b border-gray-200 p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
            <button
              onClick={() => router.push(`/friend/${selectedUserId}`)}
              className="hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <Avatar
                src={selectedUser?.avatar}
                alt={selectedUser?.username || 'User'}
                size="sm"
                className="md:w-10 md:h-10"
              />
            </button>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">{selectedUser?.username}</h3>
            </div>
          </div>
          <div className="flex-shrink-0">
            <DropdownMenu items={dropdownItems} />
          </div>
        </div>
      </div>

      {/* Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 md:p-4 space-y-3 md:space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderId === userData?.id}
            senderName={message.senderId === userData?.id ? userData?.username || 'You' : selectedUser?.username || 'Unknown'}
            senderAvatar={message.senderId === userData?.id ? userData?.avatar : selectedUser?.avatar}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onReply={handleReply}
            onForward={handleForward}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Fixed */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          onFileUpload={handleFileUpload}
          onMultipleFileUpload={handleMultipleFileUpload}
          disabled={false}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
        />
      </div>

      {/* Chat Info Modal */}
      {selectedUser && (
        <ChatInfoModal
          isOpen={isChatInfoOpen}
          onClose={() => setIsChatInfoOpen(false)}
          user={{
            username: selectedUser.username,
            email: selectedUser.email,
            avatar: selectedUser.avatar,
          }}
          messages={messages}
          currentUserId={userData?.id || ''}
          lastMessageTime={selectedUser.lastMessageTime}
        />
      )}

      {/* Forward Message Modal */}
      <ForwardMessageModal
        isOpen={!!forwardingMessage}
        onClose={handleCancelForward}
        message={forwardingMessage}
        conversations={conversations}
        currentUserId={userData?.id || ''}
        onForward={handleForwardMessage}
      />
    </div>
  );
};
