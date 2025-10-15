import { useEffect, useRef } from 'react';
import { useUsersStore } from '../store/usersStore';
import { userService } from '../services/userService';

export const useUsers = (currentUserId: string) => {
  const { 
    users, 
    setUsers, 
    setLoading, 
    setError 
  } = useUsersStore();
  
  const isSubscribed = useRef(false);

  useEffect(() => {
    if (!currentUserId || isSubscribed.current) return;

    setLoading(true);
    isSubscribed.current = true;
    
    const unsubscribe = userService.subscribeToUsers(currentUserId, (newUsers) => {
      // Only update if the users have actually changed
      setUsers(newUsers);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      isSubscribed.current = false;
    };
  }, [currentUserId, setUsers, setLoading]);

  return {
    users,
  };
};
