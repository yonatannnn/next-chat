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
      
      console.log('🔔 PWA Context:', isPWA);
      console.log('🔔 Mobile Device:', isMobile);
      console.log('🔔 iOS Device:', isIOS);
      console.log('🔔 Android Device:', isAndroid);
      console.log('🔔 Service Worker Support:', 'serviceWorker' in navigator);
      console.log('🔔 Notification Support:', 'Notification' in window);
      
      // For mobile devices, we need to ensure the page is visible and focused
      if (isMobile && document.visibilityState === 'hidden') {
        console.log('🔔 Mobile device detected but page is hidden, waiting for visibility...');
        
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            console.log('🔔 Page became visible, requesting permission...');
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
      console.log('🔔 Permission result:', permission);
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        
        // Test notification capability
        if (notificationService.canNotify()) {
          console.log('✅ Notifications are ready');
        } else {
          console.warn('⚠️ Notifications not ready despite permission');
        }
      } else {
        console.log('❌ Notification permission denied or default');
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
    }
  };

  // Listen to all messages sent TO the current user
  useEffect(() => {
    if (!userData?.id) return;

    console.log('🔔 Setting up global message listener for user:', userData.id);

    // Create a service to listen to all messages where current user is the receiver
    const unsubscribe = chatService.subscribeToAllIncomingMessages(
      userData.id,
      (allMessages) => {
        console.log('🔔 Received all messages:', allMessages.length);
        
        if (!allMessages.length) return;

        // Find the latest message by timestamp
        const latestMessage = allMessages.reduce((latest, current) => {
          return current.timestamp > latest.timestamp ? current : latest;
        });
        
        console.log('🔔 Latest message found:', {
          id: latestMessage.id,
          senderId: latestMessage.senderId,
          text: latestMessage.text,
          timestamp: latestMessage.timestamp
        });
        
        // Skip if this is the same message we already processed
        if (lastMessageRef.current?.id === latestMessage.id) {
          console.log('🔔 Skipping: Same message already processed');
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
          console.log('🔔 Skipping notification: User is currently viewing this chat');
          lastMessageRef.current = {
            id: latestMessage.id,
            timestamp: latestMessage.timestamp.getTime()
          };
          return;
        }

        // Skip if the tab is focused (user is actively using the app)
        if (notificationService.isTabFocused()) {
          console.log('🔔 Skipping notification: Tab is focused (user is actively using the app)');
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
        
        console.log('🔔 Showing notification for message from:', senderName);
        
        notificationService.showChatNotification(
          senderName,
          latestMessage.text,
          latestMessage.senderId
        ).then(notification => {
          if (notification) {
            console.log('🔔 Notification shown successfully');
            // Handle notification click
            notification.onclick = () => {
              window.focus();
              // You can add logic here to navigate to the specific chat
              notification.close();
            };
          } else {
            console.log('🔔 Failed to show notification');
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
      console.log('🔔 Cleaning up global message listener');
      unsubscribe();
    };
  }, [userData?.id, selectedUserId, conversations]);

  return {
    canNotify: notificationService.canNotify(),
    permission: notificationService.getPermission(),
    requestPermission: () => notificationService.requestPermission(),
  };
};
