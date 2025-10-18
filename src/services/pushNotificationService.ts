import { supabase } from '@/lib/supabase';

export interface PushSubscriptionData {
  userId: string;
  deviceId: string; // Add device ID for multiple device support
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
          deviceId: subscriptionData.deviceId,
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

      console.log('Push subscription stored successfully for device:', subscriptionData.deviceId);
      return true;
    } catch (error) {
      console.error('Error in storePushSubscription:', error);
      return false;
    }
  }

  /**
   * Get push subscription for a user (legacy method - returns first device)
   */
  async getPushSubscription(userId: string): Promise<PushSubscriptionData | null> {
    try {
      const subscriptions = await this.getAllPushSubscriptions(userId);
      return subscriptions.length > 0 ? subscriptions[0] : null;
    } catch (error) {
      console.error('Error in getPushSubscription:', error);
      return null;
    }
  }

  /**
   * Get all push subscriptions for a user (multiple devices)
   */
  async getAllPushSubscriptions(userId: string): Promise<PushSubscriptionData[]> {
    try {
      // Use API endpoint with service role for database operations
      const response = await fetch(`/api/push-subscriptions?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error getting push subscriptions:', response.statusText);
        return [];
      }

      const data = await response.json();
      return data.subscriptions || [];
    } catch (error) {
      console.error('Error in getAllPushSubscriptions:', error);
      return [];
    }
  }

  /**
   * Send push notification to a user (legacy method - sends to first device)
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
   * Send push notification to all devices for a user
   */
  async sendPushNotificationToAllDevices(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      const subscriptions = await this.getAllPushSubscriptions(userId);
      if (subscriptions.length === 0) {
        console.log('No push subscriptions found for user:', userId);
        return false;
      }

      let successCount = 0;
      const promises = subscriptions.map(async (subscription) => {
        try {
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

          if (response.ok) {
            successCount++;
            console.log(`Push notification sent to device ${subscription.deviceId}`);
          } else {
            console.error(`Failed to send push notification to device ${subscription.deviceId}:`, response.statusText);
          }
        } catch (error) {
          console.error(`Error sending push notification to device ${subscription.deviceId}:`, error);
        }
      });

      await Promise.all(promises);
      console.log(`Push notifications sent to ${successCount}/${subscriptions.length} devices for user:`, userId);
      return successCount > 0;
    } catch (error) {
      console.error('Error sending push notifications to all devices:', error);
      return false;
    }
  }

  /**
   * Send chat message notification to all devices
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
      title: `${senderName}`,
      body: truncatedMessage,
      icon: '/icons/icon-192x192.png',
      badge: undefined,
      tag: `chat-${senderId}`,
      data: {
        type: 'chat',
        senderId,
        senderName,
        messageText: truncatedMessage
      }
    };

    return await this.sendPushNotificationToAllDevices(receiverId, payload);
  }

  /**
   * Remove push subscription for a user (removes all devices - legacy method)
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

      console.log('All push subscriptions removed for user:', userId);
      return true;
    } catch (error) {
      console.error('Error in removePushSubscription:', error);
      return false;
    }
  }

  /**
   * Remove push subscription for a specific device
   */
  async removePushSubscriptionForDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('Supabase not initialized');
        return false;
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('device_id', deviceId);

      if (error) {
        console.error('Error removing push subscription for device:', error);
        return false;
      }

      console.log('Push subscription removed for device:', deviceId, 'of user:', userId);
      return true;
    } catch (error) {
      console.error('Error in removePushSubscriptionForDevice:', error);
      return false;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
