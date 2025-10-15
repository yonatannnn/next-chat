import React, { useState } from 'react';
import Image from 'next/image';
import { Avatar } from '@/components/ui/Avatar';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { Message } from '@/features/chat/store/chatStore';
import { Edit2, Trash2, Check, X } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName: string;
  senderAvatar?: string;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  senderName,
  senderAvatar,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  const handleEdit = () => {
    if (onEdit && editText.trim() !== message.text) {
      onEdit(message.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(message.text);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this message?')) {
      onDelete(message.id);
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 md:mb-4`}>
      <div className={`flex max-w-[85%] sm:max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isOwn && (
          <Avatar
            src={senderAvatar}
            alt={senderName}
            size="sm"
            className="mr-2 flex-shrink-0"
          />
        )}
        <div className={`${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
          {!isOwn && (
            <span className="text-xs text-gray-500 mb-1">{senderName}</span>
          )}
          <div
            className={`px-3 py-2 md:px-4 md:py-2 rounded-lg relative group ${
              isOwn
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {!message.deleted && (message.fileUrl || message.fileUrls) && (
              <div className="mb-2">
                {message.fileUrls && message.fileUrls.length > 0 ? (
                  // Multiple images - show as gallery
                  <div className="grid gap-2" style={{
                    gridTemplateColumns: message.fileUrls.length === 1 ? '1fr' : 
                                       message.fileUrls.length === 2 ? '1fr 1fr' : 
                                       message.fileUrls.length === 3 ? '1fr 1fr 1fr' : 
                                       'repeat(2, 1fr)'
                  }}>
                    {message.fileUrls.map((url, index) => (
                      <div 
                        key={index}
                        className="cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setIsImageViewerOpen(true)}
                        title="Click to view full size"
                      >
                        <Image
                          src={url}
                          alt={`Uploaded file ${index + 1}`}
                          width={200}
                          height={150}
                          className="w-full h-auto rounded object-cover"
                          style={{ aspectRatio: '4/3' }}
                        />
                      </div>
                    ))}
                    {message.fileUrls.length > 4 && (
                      <div className="relative">
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                          <span className="text-white font-medium">
                            +{message.fileUrls.length - 4} more
                          </span>
                        </div>
                        <Image
                          src={message.fileUrls[3]}
                          alt="More images"
                          width={200}
                          height={150}
                          className="w-full h-auto rounded object-cover"
                          style={{ aspectRatio: '4/3' }}
                        />
                      </div>
                    )}
                  </div>
                ) : message.fileUrl ? (
                  // Single image
                  <div 
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setIsImageViewerOpen(true)}
                    title="Click to view full size"
                  >
                    <Image
                      src={message.fileUrl}
                      alt="Uploaded file"
                      width={300}
                      height={200}
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                ) : null}
              </div>
            )}
            
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-2 border rounded text-gray-900 text-sm resize-none placeholder-gray-400"
                  style={{ color: '#1f2937', backgroundColor: 'white' }}
                  rows={2}
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleEdit}
                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                    title="Save"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    title="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm md:text-base">
                  {message.deleted ? (
                    <span className="italic text-gray-500">This message was deleted</span>
                  ) : (
                    message.text
                  )}
                </p>
                {message.edited && (
                  <span className="text-xs opacity-70">(edited)</span>
                )}
              </div>
            )}

            {/* Edit/Delete buttons - only show for own messages and when not deleted */}
            {isOwn && !message.deleted && !isEditing && (
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Edit message"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                    title="Delete message"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500 mt-1">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {(message.fileUrl || message.fileUrls) && (
        <ImageViewer
          src={message.fileUrl || (message.fileUrls && message.fileUrls[0]) || ''}
          alt="Uploaded file"
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          images={message.fileUrls || (message.fileUrl ? [message.fileUrl] : [])}
          currentIndex={currentImageIndex}
          onNavigate={setCurrentImageIndex}
        />
      )}
    </div>
  );
};
