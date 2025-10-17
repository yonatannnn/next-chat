import { NextApiRequest, NextApiResponse } from 'next';
import { notificationService } from '@/utils/notificationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { title, body, type } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Missing title or body' });
    }

    try {
      // Test basic notification
      const result = await notificationService.showNotification(
        title,
        body,
        '/icons/icon-192x192.png',
        {
          tag: 'test-notification',
          data: { type: type || 'test' }
        }
      );

      if (result) {
        res.status(200).json({ 
          success: true, 
          message: 'Notification sent successfully' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send notification' 
        });
      }
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
