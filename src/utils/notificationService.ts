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
      this.permission = await Notification.requestPermission();
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
      // Check if service worker is available for PWA notifications
      if ('serviceWorker' in navigator && 'Notification' in window) {
        const registration = await navigator.serviceWorker.ready;
        
        if (registration.active) {
          // Use service worker for PWA notifications
          const notificationOptions = {
            body: data.body,
            icon: data.icon || '/icons/icon-192x192.png',
            badge: data.badge || '/icons/icon-72x72.png',
            tag: data.tag,
            data: data.data,
            requireInteraction: true,
            actions: [
              {
                action: 'open',
                title: 'Open Chat'
              },
              {
                action: 'close',
                title: 'Dismiss'
              }
            ]
          };

          // Send message to service worker to show notification
          registration.active.postMessage({
            action: 'showNotification',
            title: data.title,
            options: notificationOptions
          });

          console.log('PWA notification sent to service worker');
          return null; // Service worker handles the notification
        }
      }

      // Fallback to regular notification API
      const notification = new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/icon-72x72.png',
        tag: data.tag,
        data: data.data,
        requireInteraction: true,
        silent: false,
      });

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
