import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { VoiceRecorder } from '@/components/ui/VoiceRecorder';
import { Camera } from '@/components/ui/Camera';
import { Paperclip, Send, X, Mic } from 'lucide-react';
import { Message } from '@/features/chat/store/chatStore';

interface MessageInputProps {
  onSendMessage: (text: string, fileUrl?: string, fileUrls?: string[], replyTo?: Message) => void;
  onFileUpload: (file: File) => Promise<string>;
  onMultipleFileUpload: (files: File[]) => Promise<string[]>;
  onSendVoiceMessage: (audioBlob: Blob, replyTo?: Message) => void;
  onTyping?: () => void;
  disabled?: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  enableGlobalTyping?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onFileUpload,
  onMultipleFileUpload,
  onSendVoiceMessage,
  onTyping,
  disabled = false,
  replyingTo,
  onCancelReply,
  enableGlobalTyping = false,
}) => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    onSendMessage(message.trim(), undefined, undefined, replyingTo || undefined);
    setMessage('');
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleVoiceMessage = (audioBlob: Blob) => {
    onSendVoiceMessage(audioBlob, replyingTo || undefined);
  };

  const handlePhotoCapture = async (file: File) => {
    setIsUploading(true);
    try {
      const fileUrl = await onFileUpload(file);
      onSendMessage('', fileUrl, undefined, replyingTo || undefined);
    } catch (error) {
      console.error('Photo upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Global keyboard event listener for typing in chat
  useEffect(() => {
    if (!enableGlobalTyping) return;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only handle if we're not already focused on an input/textarea
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' ||
                           (activeElement as HTMLElement)?.contentEditable === 'true';

      // Don't interfere if user is typing in other inputs
      if (isInputFocused) return;

      // Don't handle special keys or shortcuts
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Don't handle function keys, arrows, etc.
      if (event.key.length > 1 && !['Backspace', 'Delete', 'Enter'].includes(event.key)) return;

      // Focus the input and let the key event propagate
      if (inputRef.current) {
        inputRef.current.focus();
        // Let the natural input handling take over
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [enableGlobalTyping]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      if (files.length === 1) {
        // Single file upload
        const fileUrl = await onFileUpload(files[0]);
        onSendMessage('', fileUrl);
      } else {
        // Multiple file upload
        const fileUrls = await onMultipleFileUpload(files);
        onSendMessage('', undefined, fileUrls);
      }
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-3 md:p-4 bg-white dark:bg-gray-900">
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-500 dark:border-blue-400 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Replying to {replyingTo.senderId}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {replyingTo.text.length > 100 
                  ? `${replyingTo.text.substring(0, 100)}...` 
                  : replyingTo.text}
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="ml-2 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Cancel reply"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="p-1.5 md:p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Upload file"
        >
          <Paperclip size={18} className="md:w-5 md:h-5" />
        </button>
        <Camera onPhotoCapture={handlePhotoCapture} disabled={disabled || isUploading} />
        <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={disabled} />
        <VoiceRecorder onSendVoiceMessage={handleVoiceMessage} disabled={disabled} />
        <div className="flex-1 min-w-0">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              onTyping?.();
            }}
            placeholder="Type a message..."
            disabled={disabled}
            className="w-full text-sm md:text-base"
          />
        </div>
        <Button
          type="submit"
          disabled={!message.trim() || disabled || isUploading}
          isLoading={isUploading}
          size="sm"
          className="flex-shrink-0"
        >
          <Send size={14} className="md:w-4 md:h-4" />
        </Button>
      </form>
    </div>
  );
};
