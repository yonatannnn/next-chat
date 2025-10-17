import { NextApiRequest, NextApiResponse } from 'next';
import { pushNotificationService } from '@/services/pushNotificationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, title, body } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const success = await pushNotificationService.sendPushNotification(userId, {
      title: title || 'Test Notification',
      body: body || 'This is a test push notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'test-notification',
      data: { type: 'test' }
    });

    if (success) {
      return res.status(200).json({ success: true, message: 'Push notification sent' });
    } else {
      return res.status(500).json({ error: 'Failed to send push notification' });
    }
  } catch (error) {
    console.error('Error in test-push API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
