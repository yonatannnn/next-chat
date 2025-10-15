'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { authService } from '@/features/auth/services/authService';
import { Camera, Loader2 } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface RegisterForm {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading, error } = useAuth();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    mode: 'onBlur',
    reValidateMode: 'onChange'
  });

  const [avatar, setAvatar] = useState<string>('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const password = watch('password');

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

    setIsUploadingAvatar(true);
    try {
      // For registration, we'll upload the avatar after user creation
      // For now, we'll create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setAvatar(previewUrl);
    } catch (error) {
      alert('Failed to process avatar. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    try {
      // Upload avatar if provided
      let avatarUrl = '';
      if (avatar && fileInputRef.current?.files?.[0]) {
        try {
          // We'll need to create a temporary user ID for upload
          // In a real app, you might want to handle this differently
          const tempUserId = `temp-${Date.now()}`;
          avatarUrl = await authService.uploadAvatar(fileInputRef.current.files[0], tempUserId);
        } catch (error) {
          console.warn('Failed to upload avatar during registration:', error);
          // Continue with registration even if avatar upload fails
        }
      }

      await registerUser(data.email, data.password, data.username, data.name, avatarUrl);
      router.push('/chat');
    } catch (error) {
      console.error('Registration error:', error);
      // Error is handled by the useAuth hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div>
          <h2 className="mt-6 text-center text-2xl md:text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your existing account
            </Link>
          </p>
        </div>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <Avatar
                src={avatar}
                alt="Profile Picture"
                size="xl"
                className="ring-4 ring-blue-100"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-1.5 md:p-2 shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isUploadingAvatar ? (
                  <Loader2 size={14} className="animate-spin md:w-4 md:h-4" />
                ) : (
                  <Camera size={14} className="md:w-4 md:h-4" />
                )}
              </button>
            </div>
            <p className="text-xs md:text-sm text-gray-500 text-center">
              {avatar ? 'Click to change photo' : 'Add a profile picture (optional)'}
            </p>
          </div>

          <div className="space-y-4">
            <Input
              {...register('name', { 
                required: 'Full name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters'
                }
              })}
              label="Full Name"
              type="text"
              error={errors.name?.message}
            />
            <Input
              {...register('username', { 
                required: 'Username is required',
                minLength: {
                  value: 3,
                  message: 'Username must be at least 3 characters'
                }
              })}
              label="Username"
              type="text"
              error={errors.username?.message}
            />
            <Input
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              label="Email address"
              type="email"
              error={errors.email?.message}
            />
            <Input
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
              label="Password"
              type="password"
              error={errors.password?.message}
            />
            <Input
              {...register('confirmPassword', { 
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match'
              })}
              label="Confirm Password"
              type="password"
              error={errors.confirmPassword?.message}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            disabled={isLoading}
          >
            Create account
          </Button>
        </form>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
