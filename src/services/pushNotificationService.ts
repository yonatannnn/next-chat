import { supabase } from '@/lib/supabase';

export interface PushSubscriptionData {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  platform?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

class PushNotificationService {
  /**
   * Store push subscription in database
   */
  async storePushSubscription(subscriptionData: PushSubscriptionData): Promise<boolean> {
    try {
      // Use API endpoint with service role for database operations
      const response = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: subscriptionData.userId,
          endpoint: subscriptionData.endpoint,
          p256dh: subscriptionData.p256dh,
          auth: subscriptionData.auth,
          userAgent: subscriptionData.userAgent,
          platform: subscriptionData.platform,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error storing push subscription:', errorData);
        return false;
      }

      console.log('Push subscription stored successfully');
      return true;
    } catch (error) {
      console.error('Error in storePushSubscription:', error);
      return false;
    }
  }

  /**
   * Get push subscription for a user
   */
  async getPushSubscription(userId: string): Promise<PushSubscriptionData | null> {
    try {
      // Use API endpoint with service role for database operations
      const response = await fetch(`/api/push-subscriptions?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error getting push subscription:', response.statusText);
        return null;
      }

      const data = await response.json();
      return data.subscription || null;
    } catch (error) {
      console.error('Error in getPushSubscription:', error);
      return null;
    }
  }

  /**
   * Send push notification to a user
   */
  async sendPushNotification(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      const subscription = await this.getPushSubscription(userId);
      if (!subscription) {
        console.log('No push subscription found for user:', userId);
        return false;
      }

      const response = await fetch('/api/push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          payload
        })
      });

      if (!response.ok) {
        console.error('Failed to send push notification:', response.statusText);
        return false;
      }

      console.log('Push notification sent successfully to user:', userId);
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send chat message notification
   */
  async sendChatNotification(
    receiverId: string, 
    senderName: string, 
    messageText: string, 
    senderId: string
  ): Promise<boolean> {
    const truncatedMessage = messageText.length > 100 
      ? messageText.substring(0, 100) + '...' 
      : messageText;

    const payload: NotificationPayload = {
      title: `New message from ${senderName}`,
      body: truncatedMessage,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: `chat-${senderId}`,
      data: {
        type: 'chat',
        senderId,
        senderName,
        messageText: truncatedMessage
      }
    };

    return await this.sendPushNotification(receiverId, payload);
  }

  /**
   * Remove push subscription for a user
   */
  async removePushSubscription(userId: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('Supabase not initialized');
        return false;
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing push subscription:', error);
        return false;
      }

      console.log('Push subscription removed for user:', userId);
      return true;
    } catch (error) {
      console.error('Error in removePushSubscription:', error);
      return false;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
