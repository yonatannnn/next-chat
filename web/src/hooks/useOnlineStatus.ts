import { useEffect, useState, useCallback } from 'react';
import { onlineStatusService } from '@/services/onlineStatusService';

interface UserStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: number;
}

interface UseOnlineStatusReturn {
  isOnline: boolean;
  lastSeen: number | null;
  allStatuses: Record<string, UserStatus>;
  updateUserStatus: (userId: string, isOnline: boolean) => void;
}

export const useOnlineStatus = (userId?: string): UseOnlineStatusReturn => {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [allStatuses, setAllStatuses] = useState<Record<string, UserStatus>>({});

  // Handle status changes from the service
  const handleStatusChange = useCallback((status: UserStatus) => {
    setAllStatuses(prev => ({
      ...prev,
      [status.userId]: status
    }));

    // Update current user's status if it matches
    if (userId && status.userId === userId) {
      setIsOnline(status.isOnline);
      setLastSeen(status.lastSeen);
    }
  }, [userId]);

  // Initialize connection and fetch initial status
  useEffect(() => {
    if (!userId) return;

    // Connect to status service
    onlineStatusService.connect(userId, { userId });

    // Set up status change listener
    onlineStatusService.onStatusChange(handleStatusChange);

    // Fetch initial status
    const fetchInitialStatus = async () => {
      try {
        const status = await onlineStatusService.getStatus(userId);
        if (status) {
          setIsOnline(status.isOnline);
          setLastSeen(status.lastSeen);
        }

        // Fetch all statuses
        const allStatuses = await onlineStatusService.getAllStatuses();
        setAllStatuses(allStatuses);
      } catch (error) {
        console.error('Error fetching initial status:', error);
      }
    };

    fetchInitialStatus();

    // Cleanup on unmount
    return () => {
      onlineStatusService.offStatusChange(handleStatusChange);
      onlineStatusService.disconnect();
    };
  }, [userId, handleStatusChange]);

  // Update user status manually
  const updateUserStatus = useCallback((userId: string, isOnline: boolean) => {
    setAllStatuses(prev => ({
      ...prev,
      [userId]: {
        userId,
        isOnline,
        lastSeen: Date.now()
      }
    }));
  }, []);

  return {
    isOnline,
    lastSeen,
    allStatuses,
    updateUserStatus
  };
};
