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
    console.log('🔔 PUSH DEBUG: sendChatNotification called');
    console.log('🔔 PUSH DEBUG: receiverId:', receiverId);
    console.log('🔔 PUSH DEBUG: senderName:', senderName);
    console.log('🔔 PUSH DEBUG: messageText:', messageText);
    
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

    console.log('🔔 PUSH DEBUG: Sending push notification to all devices for user:', receiverId);
    
    // Send both web push notifications and FCM notifications
    const webPushResult = await this.sendPushNotificationToAllDevices(receiverId, payload);
    const fcmResult = await this.sendFCMNotificationToMobileDevices(receiverId, payload);
    
    return webPushResult || fcmResult;
  }

  /**
   * Send FCM notification to mobile devices
   */
  async sendFCMNotificationToMobileDevices(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      console.log('🔔 FCM DEBUG: Sending FCM notification to mobile devices for user:', userId);
      
      // Get all mobile device subscriptions for the user
      const subscriptions = await this.getAllPushSubscriptions(userId);
      console.log('🔔 FCM DEBUG: All subscriptions for user:', subscriptions);
      
      const mobileSubscriptions = subscriptions.filter(sub => 
        sub.platform === 'android' || sub.platform === 'ios' || 
        sub.userAgent?.includes('flutter_mobile') || 
        sub.endpoint?.includes('fcm')
      );

      console.log('🔔 FCM DEBUG: Mobile subscriptions found:', mobileSubscriptions);

      if (mobileSubscriptions.length === 0) {
        console.log('🔔 FCM DEBUG: No mobile devices found for user:', userId);
        console.log('🔔 FCM DEBUG: Available subscriptions:', subscriptions.map(sub => ({
          platform: sub.platform,
          userAgent: sub.userAgent,
          endpoint: sub.endpoint?.substring(0, 20) + '...'
        })));
        return false;
      }

      console.log(`🔔 FCM DEBUG: Found ${mobileSubscriptions.length} mobile devices for user:`, userId);

      let successCount = 0;
      const promises = mobileSubscriptions.map(async (subscription) => {
        try {
          console.log(`🔔 FCM DEBUG: Sending to device ${subscription.deviceId} with token: ${subscription.endpoint?.substring(0, 20)}...`);
          
          // Validate token before sending
          if (!subscription.endpoint || subscription.endpoint.length < 100) {
            console.error(`🔔 FCM DEBUG: Invalid token for device ${subscription.deviceId}:`, subscription.endpoint);
            return;
          }

          // Check if token looks like a device ID instead of FCM token
          if (subscription.endpoint.startsWith('flutter_') || subscription.endpoint.includes('device')) {
            console.error(`🔔 FCM DEBUG: Device ${subscription.deviceId} has device ID instead of FCM token:`, subscription.endpoint);
            return;
          }
          
          // Send FCM notification using the server API
          const response = await fetch('/api/fcm-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: subscription.endpoint,
              title: payload.title,
              body: payload.body,
              data: payload.data
            })
          });

          const responseText = await response.text();
          console.log(`🔔 FCM DEBUG: Response for device ${subscription.deviceId}:`, response.status, responseText);

          if (response.ok) {
            successCount++;
            console.log(`🔔 FCM DEBUG: FCM notification sent to device ${subscription.deviceId}`);
          } else {
            console.error(`🔔 FCM DEBUG: Failed to send FCM notification to device ${subscription.deviceId}:`, response.statusText, responseText);
            
            // If token is invalid, we might want to remove it from the database
            if (response.status === 400 && responseText.includes('Invalid FCM token')) {
              console.log(`🔔 FCM DEBUG: Removing invalid token for device ${subscription.deviceId}`);
              // TODO: Remove invalid token from database
            }
          }
        } catch (error) {
          console.error(`🔔 FCM DEBUG: Error sending FCM notification to device ${subscription.deviceId}:`, error);
        }
      });

      await Promise.all(promises);
      console.log(`🔔 FCM DEBUG: FCM notifications sent to ${successCount}/${mobileSubscriptions.length} mobile devices for user:`, userId);
      return successCount > 0;
    } catch (error) {
      console.error('🔔 FCM DEBUG: Error sending FCM notifications to mobile devices:', error);
      return false;
    }
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
      console.log('🔴 PUSH DEBUG: Removing push subscription for device:', deviceId, 'user:', userId);
      
      if (!supabase) {
        console.error('🔴 PUSH DEBUG: Supabase not initialized');
        return false;
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('device_id', deviceId);

      if (error) {
        console.error('🔴 PUSH DEBUG: Error removing push subscription for device:', error);
        return false;
      }

      console.log('🔴 PUSH DEBUG: Push subscription removed for device:', deviceId, 'of user:', userId);
      return true;
    } catch (error) {
      console.error('🔴 PUSH DEBUG: Error in removePushSubscriptionForDevice:', error);
      return false;
    }
  }
}
export const pushNotificationService = new PushNotificationService();

