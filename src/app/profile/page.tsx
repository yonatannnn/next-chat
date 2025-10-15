'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { authService } from '@/features/auth/services/authService';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Camera, Save, User, Mail, Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, userData, setUserData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    username: userData?.username || '',
    email: userData?.email || '',
  });
  const [avatar, setAvatar] = useState(userData?.avatar || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameValidating, setUsernameValidating] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [createdAt, setCreatedAt] = useState<string>('');

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        username: userData.username,
        email: userData.email,
      });
      setAvatar(userData.avatar || '');
    }
  }, [userData]);

  useEffect(() => {
    if (user?.metadata?.creationTime) {
      setCreatedAt(new Date(user.metadata.creationTime).toLocaleDateString());
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'username') {
      setUsernameError('');
      setSaveMessage('');
    }
  };

  const validateUsername = async (username: string) => {
    if (!username.trim()) {
      setUsernameError('Username is required');
      return false;
    }

    if (username === userData?.username) {
      setUsernameError('');
      return true;
    }

    setUsernameValidating(true);
    try {
      const isAvailable = await authService.checkUsernameAvailability(username, user?.uid);
      if (!isAvailable) {
        setUsernameError('Username is already taken');
        return false;
      }
      setUsernameError('');
      return true;
    } catch (error) {
      setUsernameError('Error checking username availability');
      return false;
    } finally {
      setUsernameValidating(false);
    }
  };

  const handleUsernameBlur = async () => {
    await validateUsername(formData.username);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsLoading(true);
    try {
      const avatarUrl = await authService.uploadAvatar(file, user?.uid!);
      setAvatar(avatarUrl);
      setSaveMessage('Avatar updated successfully!');
    } catch (error) {
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    const isUsernameValid = await validateUsername(formData.username);
    if (!isUsernameValid) return;

    setIsSaving(true);
    try {
      const updates: any = {};
      
      if (formData.name !== userData?.name) {
        updates.name = formData.name;
      }
      
      if (formData.username !== userData?.username) {
        updates.username = formData.username;
      }
      
      if (avatar !== userData?.avatar) {
        updates.avatar = avatar;
      }

      if (Object.keys(updates).length > 0) {
        await authService.updateProfile(user.uid, updates);
        setUserData({ ...userData!, ...updates });
        setSaveMessage('Profile updated successfully!');
      } else {
        setSaveMessage('No changes to save');
      }
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = formData.name !== userData?.name || formData.username !== userData?.username || avatar !== userData?.avatar;

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
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Profile Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 md:px-8 py-8 md:py-12">
            <div className="flex items-center space-x-4 md:space-x-6">
              <div className="relative">
                <Avatar
                  src={avatar}
                  alt={formData.username}
                  size="xl"
                  className="ring-4 ring-white/20"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 md:p-2 shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin text-blue-600 md:w-4 md:h-4" />
                  ) : (
                    <Camera size={14} className="text-blue-600 md:w-4 md:h-4" />
                  )}
                </button>
              </div>
              <div className="text-white min-w-0 flex-1">
                <h2 className="text-2xl md:text-3xl font-bold truncate">{formData.username}</h2>
                <p className="text-blue-100 mt-1 text-sm md:text-base truncate">{formData.email}</p>
                {createdAt && (
                  <p className="text-blue-200 text-xs md:text-sm mt-2">
                    Member since {createdAt}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="p-4 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <div className="relative">
                  <Input
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    onBlur={handleUsernameBlur}
                    placeholder="Enter your username"
                    className={`pr-10 ${usernameError ? 'border-red-300 focus:border-red-500' : ''}`}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {usernameValidating ? (
                      <Loader2 size={16} className="animate-spin text-gray-400" />
                    ) : usernameError ? (
                      <XCircle size={16} className="text-red-500" />
                    ) : formData.username && !usernameError ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : null}
                  </div>
                </div>
                {usernameError && (
                  <p className="text-sm text-red-600">{usernameError}</p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    value={formData.email}
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <Mail size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Email cannot be changed</p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <div className="flex items-center space-x-3">
                  <User size={18} className="text-gray-600 md:w-5 md:h-5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">Profile ID</p>
                    <p className="text-xs text-gray-500 font-mono truncate">{user?.uid}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <div className="flex items-center space-x-3">
                  <Calendar size={18} className="text-gray-600 md:w-5 md:h-5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">Account Created</p>
                    <p className="text-xs text-gray-500">{createdAt || 'Unknown'}</p>
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

            {/* Save Message */}
            {saveMessage && (
              <div className={`mt-6 p-4 rounded-lg ${
                saveMessage.includes('success') 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}>
                <p className="text-sm font-medium">{saveMessage}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges || !!usernameError || usernameValidating}
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        className="hidden"
      />
    </div>
  );
}
