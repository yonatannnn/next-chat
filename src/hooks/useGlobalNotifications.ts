import { useEffect, useRef } from 'react';
import { notificationService } from '@/utils/notificationService';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useChatStore } from '@/features/chat/store/chatStore';
import { chatService } from '@/features/chat/services/chatService';

export const useGlobalNotifications = () => {
  const { userData } = useAuthStore();
  const { selectedUserId, conversations } = useChatStore();
  const lastMessageRef = useRef<{ id: string; timestamp: number } | null>(null);
  const hasRequestedPermission = useRef(false);

  // Debug logging
  console.log('🔔 NOTIFICATION DEBUG: useGlobalNotifications hook running');
  console.log('🔔 NOTIFICATION DEBUG: userData:', userData?.id);
  console.log('🔔 NOTIFICATION DEBUG: selectedUserId:', selectedUserId);

  // Request notification permission on first load
  useEffect(() => {
    if (!userData?.id) {
      console.log('🔔 NOTIFICATION DEBUG: No userData, skipping permission request');
      return;
    }
    
    if (!hasRequestedPermission.current) {
      hasRequestedPermission.current = true;
      
      // Check if we're in a PWA context
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone === true;
      
      // Check if we're on a mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      
      // For mobile devices, we need to ensure the page is visible and focused
      if (isMobile && document.visibilityState === 'hidden') {
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            requestNotificationPermission();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
          }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return;
      }
      
      requestNotificationPermission();
    }
  }, [userData]);

  const requestNotificationPermission = async () => {
    try {
      const permission = await notificationService.requestPermission();
      
      if (permission === 'granted') {
        // Test notification capability
        if (!notificationService.canNotify()) {
          console.warn('Notifications not ready despite permission');
        } else {
          // Register push subscription with server for background notifications
          console.log('Registering push subscription with server...');
          if (userData?.id) {
            await notificationService.registerPushSubscription(userData.id);
          }
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Listen to all messages sent TO the current user
  useEffect(() => {
    if (!userData?.id) {
      console.log('🔔 NOTIFICATION DEBUG: No userData, skipping message listener');
      return;
    }

    console.log('🔔 NOTIFICATION DEBUG: Setting up message listener for user:', userData.id);

    // Create a service to listen to all messages where current user is the receiver
    const unsubscribe = chatService.subscribeToAllIncomingMessages(
      userData.id,
      (allMessages) => {
        console.log('🔔 NOTIFICATION DEBUG: Received messages:', allMessages.length);
        console.log('🔔 NOTIFICATION DEBUG: Current userData:', userData?.id);
        
        if (!allMessages.length) return;

        // Find the latest message by timestamp
        const latestMessage = allMessages.reduce((latest, current) => {
          return current.timestamp > latest.timestamp ? current : latest;
        });
        
        // Skip if this is the same message we already processed
        if (lastMessageRef.current?.id === latestMessage.id) {
          return;
        }

        // Skip if the message is from the current user (shouldn't happen but just in case)
        if (latestMessage.senderId === userData.id) {
          lastMessageRef.current = {
            id: latestMessage.id,
            timestamp: latestMessage.timestamp.getTime()
          };
          return;
        }

        // Skip if we're currently viewing the chat with this sender
        // This prevents notifications when user is actively in the chat
        if (selectedUserId === latestMessage.senderId) {
          lastMessageRef.current = {
            id: latestMessage.id,
            timestamp: latestMessage.timestamp.getTime()
          };
          return;
        }

        // Skip if the tab is focused (user is actively using the app)
        if (notificationService.isTabFocused()) {
          lastMessageRef.current = {
            id: latestMessage.id,
            timestamp: latestMessage.timestamp.getTime()
          };
          return;
        }

        // Skip if the message is deleted
        if (latestMessage.deleted) {
          lastMessageRef.current = {
            id: latestMessage.id,
            timestamp: latestMessage.timestamp.getTime()
          };
          return;
        }

        // Check notification permission
        if (!notificationService.canNotify()) {
          lastMessageRef.current = {
            id: latestMessage.id,
            timestamp: latestMessage.timestamp.getTime()
          };
          return;
        }

        // Show notification for new message
        const senderName = conversations.find(conv => conv.userId === latestMessage.senderId)?.username || 'Someone';
        
        console.log('🔔 NOTIFICATION DEBUG: About to show notification');
        console.log('🔔 NOTIFICATION DEBUG: userData exists:', !!userData);
        console.log('🔔 NOTIFICATION DEBUG: userData.id:', userData?.id);
        console.log('🔔 NOTIFICATION DEBUG: New message notification:', {
          sender: senderName,
          text: latestMessage.text,
          senderId: latestMessage.senderId
        });
        
        console.log('🔔 NOTIFICATION DEBUG: Calling notificationService.showChatNotification...');
        notificationService.showChatNotification(
          senderName,
          latestMessage.text,
          latestMessage.senderId
        ).then(notification => {
          console.log('🔔 NOTIFICATION DEBUG: Notification service returned:', notification);
          if (notification) {
            // Handle notification click
            notification.onclick = () => {
              window.focus();
              // You can add logic here to navigate to the specific chat
              notification.close();
            };
          }
        }).catch(error => {
          console.error('🔔 NOTIFICATION DEBUG: Error showing notification:', error);
        });

        lastMessageRef.current = {
          id: latestMessage.id,
          timestamp: latestMessage.timestamp.getTime()
        };
      }
    );

    return () => {
      console.log('🔔 NOTIFICATION DEBUG: Cleaning up message listener for user:', userData?.id);
      unsubscribe();
    };
  }, [userData?.id, selectedUserId, conversations]);

  // Cleanup effect when user logs out
  useEffect(() => {
    if (!userData?.id) {
      console.log('🔔 NOTIFICATION DEBUG: User logged out, cleaning up notifications');
      // Reset permission flag so it can be requested again on next login
      hasRequestedPermission.current = false;
      // Clear any active notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        // Close any active notifications
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.getNotifications().then(notifications => {
              notifications.forEach(notification => {
                console.log('🔔 NOTIFICATION DEBUG: Closing notification:', notification.title);
                notification.close();
              });
            });
          });
        });
      }
    }
  }, [userData]);

  return {
    canNotify: notificationService.canNotify(),
    permission: notificationService.getPermission(),
    requestPermission: () => notificationService.requestPermission(),
  };
};
