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
    if (!this.isSupported) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    // Additional checks for mobile browsers
    if (this.isMobile()) {
      // For iOS, ensure we're in a user interaction context
      if (this.isIOS() && document.visibilityState !== 'visible') {
        console.warn('Page must be visible to request notification permission on iOS');
        return 'denied';
      }
    }

    try {
      this.permission = await Notification.requestPermission();
      console.log('Notification permission:', this.permission);
      return this.permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      this.permission = 'denied';
      return 'denied';
    }
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
    console.log('showNotification called with:', data);
    console.log('canNotify():', this.canNotify());
    console.log('permission:', this.permission);
    console.log('isSupported:', this.isSupported);
    
    if (!this.canNotify()) {
      console.warn('Cannot show notification: permission denied or not supported');
      return null;
    }

    try {
      const isMobile = this.isMobile();
      console.log('isMobile:', isMobile);
      
      const notificationOptions: NotificationOptions = {
        body: data.body,
        icon: this.getAbsoluteUrl(data.icon || '/icons/icon-192x192.png'),
        badge: this.getAbsoluteUrl(data.badge || '/icons/icon-72x72.png'),
        tag: data.tag,
        data: data.data,
        requireInteraction: false, // Set to false for mobile
        silent: false,
      };

      // For now, let's just use direct notifications to ensure it works
      console.log('Using direct notification API');
      const notification = new Notification(data.title, notificationOptions);

      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Navigate to chat if it's a chat notification
        if (data.data?.type === 'chat') {
          window.location.href = '/chat';
        }
      };

      // Shorter timeout for mobile
      setTimeout(() => notification.close(), isMobile ? 5000 : 10000);

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

  private getAbsoluteUrl(path: string): string {
    if (path.startsWith('http')) return path;
    return `${window.location.origin}${path.startsWith('/') ? path : '/' + path}`;
  }

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  private isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
  }
}

// Create a singleton instance
export const notificationService = new NotificationService();
