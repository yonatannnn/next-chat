import { NextApiRequest, NextApiResponse } from 'next';
import webpush from 'web-push';

// Configure VAPID keys (same as in notificationService.ts)
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

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, payload } = req.body;

    if (!subscription || !payload) {
      return res.status(400).json({ error: 'Missing subscription or payload' });
    }

    // Send push notification
    const result = await webpush.sendNotification(
      subscription as PushSubscription,
      JSON.stringify(payload as NotificationPayload)
    );

    console.log('Push notification sent:', result.statusCode);
    return res.status(200).json({ success: true, statusCode: result.statusCode });

  } catch (error) {
    console.error('Error sending push notification:', error);
    return res.status(500).json({ error: 'Failed to send push notification' });
  }
}
