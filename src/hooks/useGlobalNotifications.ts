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

  // Request notification permission on first load
  useEffect(() => {
    if (!hasRequestedPermission.current && userData?.id) {
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
  }, [userData?.id]);

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
    if (!userData?.id) return;

    // Create a service to listen to all messages where current user is the receiver
    const unsubscribe = chatService.subscribeToAllIncomingMessages(
      userData.id,
      (allMessages) => {
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
        
        console.log('🔔 New message notification:', {
          sender: senderName,
          text: latestMessage.text,
          senderId: latestMessage.senderId
        });
        
        console.log('Calling notificationService.showChatNotification...');
        notificationService.showChatNotification(
          senderName,
          latestMessage.text,
          latestMessage.senderId
        ).then(notification => {
          console.log('Notification service returned:', notification);
          if (notification) {
            // Handle notification click
            notification.onclick = () => {
              window.focus();
              // You can add logic here to navigate to the specific chat
              notification.close();
            };
          }
        }).catch(error => {
          console.error('Error showing notification:', error);
        });

        lastMessageRef.current = {
          id: latestMessage.id,
          timestamp: latestMessage.timestamp.getTime()
        };
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userData?.id, selectedUserId, conversations]);

  return {
    canNotify: notificationService.canNotify(),
    permission: notificationService.getPermission(),
    requestPermission: () => notificationService.requestPermission(),
  };
};
