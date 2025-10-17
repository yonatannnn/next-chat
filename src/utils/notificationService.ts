export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private isSupported: boolean = false;
  private pushSupported: boolean = false;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isSupported = 'Notification' in window;
      this.pushSupported = 'PushManager' in window && 'serviceWorker' in navigator;
      this.permission = this.isSupported ? Notification.permission : 'denied';
    } else {
      this.isSupported = false;
      this.pushSupported = false;
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
      
      // If permission is granted and push is supported, register for push notifications
      if (this.permission === 'granted' && this.pushSupported) {
        await this.registerServiceWorker();
      }
      
      return this.permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      this.permission = 'denied';
      return 'denied';
    }
  }

  /**
   * Register service worker for push notifications
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.pushSupported) {
      console.warn('Push notifications not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw-push.js');
      console.log('Service worker registered:', this.registration);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service worker is ready');
      
      return this.registration;
    } catch (error) {
      console.error('Error registering service worker:', error);
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration || !this.pushSupported) {
      console.warn('Push notifications not supported or service worker not registered');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa40HI0lYbL1VU2XD0X8rVUuX8qVuYBTj3vU4d0y_0VpTYA8Yk4n7wU8iU0V'
        )
      });

      console.log('Push subscription created:', subscription);
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  /**
   * Get push subscription data
   */
  async getPushSubscription(): Promise<PushSubscriptionData | null> {
    const subscription = await this.subscribeToPush();
    if (!subscription) return null;

    const p256dh = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: p256dh ? this.arrayBufferToBase64(p256dh) : '',
        auth: auth ? this.arrayBufferToBase64(auth) : ''
      }
    };
  }

  /**
   * Send push notification via service worker
   */
  async sendPushNotification(data: NotificationData): Promise<boolean> {
    if (!this.registration) {
      console.warn('Service worker not registered');
      return false;
    }

    try {
      // Send message to service worker
      this.registration.active?.postMessage({
        action: 'showNotification',
        title: data.title,
        options: {
          body: data.body,
          icon: this.getAbsoluteUrl(data.icon || '/icons/icon-192x192.png'),
          badge: this.getAbsoluteUrl(data.badge || '/icons/icon-72x72.png'),
          tag: data.tag,
          data: data.data,
          requireInteraction: true,
          silent: false,
          vibrate: [200, 100, 200],
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
        }
      });

      console.log('Push notification sent to service worker');
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
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
      
      // For mobile devices, use push notifications via service worker
      if (isMobile && this.pushSupported && this.registration) {
        console.log('Using push notification for mobile');
        const success = await this.sendPushNotification(data);
        return success ? new Notification(data.title) : null;
      }
      
      // For desktop or when push is not available, use direct notifications
      const notificationOptions: NotificationOptions = {
        body: data.body,
        icon: this.getAbsoluteUrl(data.icon || '/icons/icon-192x192.png'),
        badge: this.getAbsoluteUrl(data.badge || '/icons/icon-72x72.png'),
        tag: data.tag,
        data: data.data,
        requireInteraction: false,
        silent: false,
      };

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

  /**
   * Convert URL-safe base64 to Uint8Array for VAPID keys
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

// Create a singleton instance
export const notificationService = new NotificationService();
