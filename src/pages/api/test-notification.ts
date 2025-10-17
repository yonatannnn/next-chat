import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { title, body, type } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Missing title or body' });
    }

    try {
      // This is a server-side API endpoint, so we can't directly show notifications
      // Instead, we'll return success and let the client handle the notification
      console.log('Test notification request received:', { title, body, type });
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      res.status(200).json({ 
        success: true, 
        message: 'API endpoint working - notification should be handled by client',
        data: {
          title,
          body,
          type: type || 'test',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('Error in test-notification API:', error);
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
