export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private isSupported: boolean = false;

  constructor() {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.isSupported = 'Notification' in window;
      this.permission = this.isSupported ? Notification.permission : 'denied';
    } else {
      this.isSupported = false;
      this.permission = 'denied';
    }
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !this.isSupported) {
      console.warn('Notifications are not supported in this browser');
      return 'denied';
    }

    if (this.permission === 'default') {
      try {
        // For mobile browsers, we need to ensure the user interaction is recent
        // and the page is in focus
        if (document.visibilityState === 'hidden') {
          console.warn('Cannot request notification permission: page is not visible');
          return 'denied';
        }

        // Check if we're on a mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isMobile) {
          // For iOS Safari, we need to ensure the user gesture is recent
          if (isIOS) {
            // iOS specific handling
          }
        }

        this.permission = await Notification.requestPermission();
        
        // For mobile, also check if service worker is ready
        if (this.permission === 'granted' && 'serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            
            // Test if service worker can show notifications
            if (registration.active) {
              // Service worker is ready
            }
          } catch (error) {
            console.error('Service worker not ready:', error);
          }
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        this.permission = 'denied';
      }
    }

    return this.permission;
  }

  /**
   * Check if notifications are supported and allowed
   */
  canNotify(): boolean {
    return this.isSupported && this.permission === 'granted';
  }

  /**
   * Show a notification
   */
  async showNotification(data: NotificationData): Promise<Notification | null> {
    if (typeof window === 'undefined' || !this.canNotify()) {
      console.warn('Cannot show notification: not supported or permission denied');
      return null;
    }

    try {
      // Check if we're on a mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      

      // Try to use our custom notification service worker first
      if ('serviceWorker' in navigator && 'Notification' in window) {
        try {
          // Register our custom notification service worker
          const notificationRegistration = await navigator.serviceWorker.register('/notifications-sw.js', {
            scope: '/'
          });
          
          if (notificationRegistration.active) {
            console.log('Using custom notification service worker');
            
            const notificationOptions = {
              body: data.body,
              icon: data.icon || '/icons/icon-192x192.png',
              badge: data.badge || '/icons/icon-72x72.png',
              tag: data.tag,
              data: data.data,
              requireInteraction: true,
              silent: false,
              vibrate: isMobile ? [200, 100, 200] : undefined,
              actions: isMobile ? [
                {
                  action: 'open',
                  title: 'Open Chat'
                },
                {
                  action: 'close',
                  title: 'Dismiss'
                }
              ] : undefined
            };

            // Send message to our custom service worker
            notificationRegistration.active.postMessage({
              action: 'showNotification',
              title: data.title,
              options: notificationOptions
            });

            console.log('Notification sent to custom service worker:', data.title);
            return null; // Service worker handles the notification
          }
        } catch (swError) {
          console.warn('Custom notification service worker not available, falling back to regular notifications:', swError);
        }
      }

      // Fallback to regular notification API
      
      const notificationOptions: NotificationOptions = {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/icon-72x72.png',
        tag: data.tag,
        data: data.data,
        requireInteraction: true,
        silent: false,
      };

      // Add vibration for mobile devices
      if (isMobile && 'vibrate' in navigator) {
        (notificationOptions as any).vibrate = [200, 100, 200];
      }

      // Add actions for mobile devices
      if (isMobile) {
        (notificationOptions as any).actions = [
          {
            action: 'open',
            title: 'Open Chat'
          },
          {
            action: 'close',
            title: 'Dismiss'
          }
        ];
      }

      const notification = new Notification(data.title, notificationOptions);

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Show a chat message notification
   */
  async showChatNotification(senderName: string, messageText: string, senderId: string): Promise<Notification | null> {
    const truncatedMessage = messageText.length > 100 
      ? messageText.substring(0, 100) + '...' 
      : messageText;

    return this.showNotification({
      title: `New message from ${senderName}`,
      body: truncatedMessage,
      tag: `chat-${senderId}`, // This will replace previous notifications from the same sender
      data: { senderId, type: 'chat' },
    });
  }

  /**
   * Close all notifications with a specific tag
   */
  closeNotificationsByTag(tag: string): void {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'getRegistrations' in navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          if (registration.active) {
            registration.active.postMessage({ action: 'closeNotificationsByTag', tag });
          }
        });
      });
    }
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * Check if the current tab is focused
   */
  isTabFocused(): boolean {
    return typeof window !== 'undefined' && document.hasFocus();
  }
}

// Create a singleton instance
export const notificationService = new NotificationService();
