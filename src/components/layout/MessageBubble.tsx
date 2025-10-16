import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Avatar } from '@/components/ui/Avatar';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { LinkifiedText } from '@/components/ui/LinkifiedText';
import { Message } from '@/features/chat/store/chatStore';
import { Edit2, Trash2, Check, X, Reply, Forward, Play, Pause, Volume2 } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName: string;
  senderAvatar?: string;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  senderName,
  senderAvatar,
  onEdit,
  onDelete,
  onReply,
  onForward,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  const handleForward = () => {
    if (onForward) {
      onForward(message);
    }
  };

  const handleVoicePlay = () => {
    if (audioRef.current) {
      if (isPlayingVoice) {
        audioRef.current.pause();
        setIsPlayingVoice(false);
      } else {
        audioRef.current.play();
        setIsPlayingVoice(true);
      }
    }
  };

  const handleVoiceEnded = () => {
    setIsPlayingVoice(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            {/* Reply context */}
            {message.replyTo && (
              <div className={`mb-2 p-2 rounded border-l-2 ${
                isOwn 
                  ? 'bg-blue-500 bg-opacity-20 border-blue-400' 
                  : 'bg-gray-200 border-gray-400'
              }`}>
                <div className="text-xs opacity-75 mb-1">
                  Replying to {message.replyTo.senderName}
                </div>
                <div className="text-xs truncate">
                  {message.replyTo.text.length > 50 
                    ? `${message.replyTo.text.substring(0, 50)}...` 
                    : message.replyTo.text}
                </div>
              </div>
            )}

            {/* Forward context */}
            {message.isForwarded && (
              <div className={`mb-2 p-2 rounded border-l-2 ${
                isOwn 
                  ? 'bg-purple-500 bg-opacity-20 border-purple-400' 
                  : 'bg-gray-200 border-gray-400'
              }`}>
                <div className="text-xs opacity-75 mb-1 flex items-center">
                  <Forward size={12} className="mr-1" />
                  Forwarded from {message.originalSenderName || 'Unknown'}
                </div>
              </div>
            )}
            {/* Voice Message */}
            {!message.deleted && message.voiceUrl && (
              <div className="mb-2">
                <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
                  <button
                    onClick={handleVoicePlay}
                    className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    {isPlayingVoice ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Volume2 size={16} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Voice message</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {message.voiceDuration ? formatDuration(message.voiceDuration) : '0:00'}
                    </div>
                  </div>
                </div>
                <audio
                  ref={audioRef}
                  src={message.voiceUrl}
                  onEnded={handleVoiceEnded}
                  className="hidden"
                />
              </div>
            )}

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
                {message.deleted ? (
                  <p className="text-sm md:text-base italic text-gray-500">
                    This message was deleted
                  </p>
                ) : (
                  <LinkifiedText 
                    text={message.text}
                    showPreviews={true}
                    className="text-sm md:text-base"
                    isOwn={isOwn}
                  />
                )}
                {message.edited && (
                  <span className="text-xs opacity-70">(edited)</span>
                )}
              </div>
            )}

            {/* Action buttons */}
            {!message.deleted && !isEditing && (
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex space-x-1">
                  {onReply && (
                    <button
                      onClick={handleReply}
                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                      title="Reply to message"
                    >
                      <Reply size={14} />
                    </button>
                  )}
                  {onForward && (
                    <button
                      onClick={handleForward}
                      className="p-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                      title="Forward message"
                    >
                      <Forward size={14} />
                    </button>
                  )}
                  {isOwn && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1 mt-1">
            <span className="text-xs text-gray-500">
              {formatTime(message.timestamp)}
            </span>
            {isOwn && message.seen && (
              <span className="text-xs text-blue-500" title={`Seen at ${message.seenAt ? formatTime(message.seenAt) : 'Unknown time'}`}>
                ✓✓
              </span>
            )}
            {isOwn && !message.seen && (
              <span className="text-xs text-gray-400">
                ✓
              </span>
            )}
          </div>
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
