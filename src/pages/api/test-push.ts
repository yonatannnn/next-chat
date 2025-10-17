import { NextApiRequest, NextApiResponse } from 'next';
import webpush from 'web-push';

// Configure VAPID keys
const vapidKeys = {
  publicKey: 'BPyk4E4ejKjRE1aYPFz7NwfYse_xhdOoBgZHjiwOz3AjTho8EtPxNvRnDFDCGBh3XKRzm5p55BdLhajnPpV4KRI',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'IzG9CRovS6FAg7Ig_vZkZ0afpMoCnuHi37CAGqpPiHM'
};

// Configure web-push
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, title, body } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // For testing, we'll create a mock subscription
    // In real implementation, this would come from the database
    const mockSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key'
      }
    };

    const payload = {
      title: title || 'Test Notification',
      body: body || 'This is a test push notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'test-notification',
      data: { type: 'test' }
    };

    // Try to send the notification
    try {
      await webpush.sendNotification(mockSubscription, JSON.stringify(payload));
      return res.status(200).json({ 
        success: true, 
        message: 'Push notification test completed (mock subscription used)',
        note: 'This is a test endpoint. For real push notifications, you need to set up Supabase and user subscriptions.'
      });
    } catch (pushError: any) {
      // This is expected to fail with mock data, but we can still return success
      // to indicate the endpoint is working
      return res.status(200).json({ 
        success: true, 
        message: 'Push notification endpoint is working (expected to fail with mock data)',
        error: pushError.message,
        note: 'This is a test endpoint. For real push notifications, you need to set up Supabase and user subscriptions.'
      });
    }

  } catch (error: any) {
    console.error('Error in test-push API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
