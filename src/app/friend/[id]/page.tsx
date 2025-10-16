'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, User, Mail, Calendar, CheckCircle, MessageCircle, Camera } from 'lucide-react';
import { ImageModal } from '@/components/ui/ImageModal';
import { RecommendProfileModal } from '@/components/ui/RecommendProfileModal';
import { useRecommendations } from '@/features/profile/hooks/useRecommendations';
import { formatTimestamp } from '@/utils/formatTimestamp';

export default function FriendProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { userData } = useAuth();
  const { users } = useUsers(userData?.id || '');
  const { allStatuses } = useOnlineStatus(userData?.id);
  const { sendRecommendation } = useRecommendations(userData?.id || '');
  const [friend, setFriend] = useState<any>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);

  useEffect(() => {
    if (params?.id && users.length > 0) {
      const foundFriend = users.find(u => u.id === params.id);
      if (foundFriend) {
        setFriend(foundFriend);
      } else {
        // Friend not found, redirect back
        router.push('/chat');
      }
    }
  }, [params?.id, users, router]);

  // Get friend's online status
  const friendStatus = friend ? allStatuses[friend.id] : null;
  const isOnline = friendStatus?.isOnline || false;
  const lastSeen = friendStatus?.lastSeen;

  // Format status text
  const getStatusText = () => {
    if (isOnline) {
      return 'Online';
    } else if (lastSeen) {
      return `Last seen ${formatTimestamp(new Date(lastSeen))}`;
    } else {
      return 'Offline';
    }
  };

  // Format status color
  const getStatusColor = () => {
    if (isOnline) {
      return 'text-green-600';
    } else {
      return 'text-gray-500';
    }
  };

  const handleStartChat = () => {
    router.push(`/chat?user=${friend?.id}`);
  };

  const handleRecommendProfile = async (imageUrl: string, message?: string) => {
    if (!friend?.id) return;
    await sendRecommendation(friend.id, imageUrl, message);
  };

  if (!friend) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center space-x-3 md:space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-1 md:space-x-2"
            >
              <ArrowLeft size={18} className="md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Back</span>
            </Button>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Profile</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 md:px-8 py-8 md:py-12">
            <div className="flex items-center space-x-4 md:space-x-6">
              <div className="relative">
                <div 
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setIsImageModalOpen(true)}
                >
                  <Avatar
                    src={friend.avatar}
                    alt={friend.username}
                    size="xl"
                    className="ring-4 ring-white/20"
                  />
                </div>
              </div>
              <div className="text-white min-w-0 flex-1">
                <h2 className="text-2xl md:text-3xl font-bold truncate">{friend.username}</h2>
                <p className="text-blue-100 mt-1 text-sm md:text-base truncate">{friend.name || friend.email}</p>
                <p className={`text-xs md:text-sm mt-2 ${isOnline ? 'text-green-200' : 'text-blue-200'}`}>
                  {getStatusText()}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-4 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Username */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <div className="relative">
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <span className="text-gray-900">{friend.username}</span>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="relative">
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <span className="text-gray-900">{friend.name || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <span className="text-gray-900">{friend.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <div className="flex items-center space-x-3">
                  <User size={18} className="text-gray-600 md:w-5 md:h-5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">Profile ID</p>
                    <p className="text-xs text-gray-500 font-mono truncate">{friend.id}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <div className="flex items-center space-x-3">
                  <Calendar size={18} className="text-gray-600 md:w-5 md:h-5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">Status</p>
                    <p className={`text-xs ${getStatusColor()}`}>{getStatusText()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle size={18} className="text-green-600 md:w-5 md:h-5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">Account Status</p>
                    <p className="text-xs text-green-600">Verified</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="w-full sm:w-auto"
              >
                Back to Chat
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsRecommendModalOpen(true)}
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <Camera size={16} />
                <span>Recommend Profile</span>
              </Button>
              <Button
                onClick={handleStartChat}
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <MessageCircle size={16} />
                <span>Start Chat</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {isImageModalOpen && (
        <ImageModal
          src={friend.avatar}
          alt={friend.username}
          onClose={() => setIsImageModalOpen(false)}
        />
      )}

      {/* Recommend Profile Modal */}
      {isRecommendModalOpen && (
        <RecommendProfileModal
          isOpen={isRecommendModalOpen}
          onClose={() => setIsRecommendModalOpen(false)}
          friendName={friend.username}
          onSendRecommendation={handleRecommendProfile}
        />
      )}
    </div>
  );
}
