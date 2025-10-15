import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Paperclip, Send } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (text: string, fileUrl?: string, fileUrls?: string[]) => void;
  onFileUpload: (file: File) => Promise<string>;
  onMultipleFileUpload: (files: File[]) => Promise<string[]>;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onFileUpload,
  onMultipleFileUpload,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    onSendMessage(message.trim());
    setMessage('');
  };

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
    <div className="border-t border-gray-200 p-3 md:p-4">
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
          className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Upload file"
        >
          <Paperclip size={18} className="md:w-5 md:h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
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
