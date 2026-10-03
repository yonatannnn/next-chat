'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/features/auth/store/authStore';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function Home() {
  const router = useRouter();
  const { user, userData, isLoading } = useAuth();
  const isOptimistic = useAuthStore((s) => s.isOptimistic);

  useEffect(() => {
    // Optimistic: if we have cached userData, redirect to chat immediately
    if (isOptimistic && userData) {
      router.replace('/chat');
      return;
    }

    // Normal: wait for Firebase to confirm
    if (!isLoading) {
      if (user) {
        router.replace('/chat');
      } else {
        router.replace('/login');
      }
    }
  }, [user, userData, isLoading, isOptimistic, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
