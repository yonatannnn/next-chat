import React, { useState } from 'react';
import { X, Upload, Send, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { ImageCropper } from './ImageCropper';
import { supabase } from '@/lib/supabase';

interface RecommendProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendName: string;
  onSendRecommendation: (imageUrl: string, message?: string) => Promise<void>;
}

export const RecommendProfileModal: React.FC<RecommendProfileModalProps> = ({
  isOpen,
  onClose,
  friendName,
  onSendRecommendation,
}) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [croppedImage, setCroppedImage] = useState<File | null>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setSelectedImage(file);
      setError(null);
      
      // Open cropper with the selected file
      setIsCropperOpen(true);
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    setCroppedImage(croppedFile);
    setSelectedImage(croppedFile);
    
    // Create preview URL for display
    const previewUrl = URL.createObjectURL(croppedFile);
    setImageUrl(previewUrl);
    
    setIsCropperOpen(false);
  };

  const handleUpload = async () => {
    if (!selectedImage || !supabase) {
      setError('Please select an image to upload');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `profile-recommendations/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, selectedImage, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      // Update to the actual uploaded URL
      setImageUrl(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (!imageUrl || !selectedImage) {
      setError('Please upload an image first');
      return;
    }

    // Check if we have a blob URL (preview) or actual uploaded URL
    if (imageUrl.startsWith('blob:')) {
      setError('Please upload the image first before sending');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await onSendRecommendation(imageUrl, message.trim() || undefined);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send recommendation');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    setImageUrl('');
    setMessage('');
    setError(null);
    setCroppedImage(null);
    setIsCropperOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Recommend Profile Picture
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Recommend a profile picture for <span className="font-medium">{friendName}</span>
          </p>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Upload Button - Show only for cropped images */}
          {croppedImage && imageUrl.startsWith('blob:') && (
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  Upload Cropped Image
                </>
              )}
            </Button>
          )}

          {/* Image Preview */}
          {imageUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Preview
                </label>
                {imageUrl.startsWith('blob:') ? (
                  <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                    Cropped - Ready to Upload
                  </span>
                ) : (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    Uploaded
                  </span>
                )}
              </div>
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="Profile recommendation"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                />
              </div>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Message (Optional)
            </label>
            <Input
              type="text"
              placeholder="Add a message with your recommendation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-gray-500">
              {message.length}/200 characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!imageUrl || imageUrl.startsWith('blob:') || isSending}
            className="flex items-center space-x-2"
          >
            {isSending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Send Recommendation</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {selectedImage && (
        <ImageCropper
          isOpen={isCropperOpen}
          onClose={() => {
            setIsCropperOpen(false);
            setSelectedImage(null);
          }}
          onCropComplete={handleCropComplete}
          imageFile={selectedImage}
          aspectRatio={1}
          title="Crop Recommendation Image"
        />
      )}
    </div>
  );
};
