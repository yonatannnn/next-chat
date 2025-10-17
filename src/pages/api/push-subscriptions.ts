import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for database operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { userId, endpoint, p256dh, auth, userAgent, platform } = req.body;

      if (!userId || !endpoint || !p256dh || !auth) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Store push subscription using service role
      // Since we're using Firebase Auth, we disable RLS and use service role
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: endpoint,
          p256dh: p256dh,
          auth: auth,
          user_agent: userAgent,
          platform: platform,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error storing push subscription:', error);
        return res.status(500).json({ error: 'Failed to store push subscription' });
      }

      return res.status(200).json({ success: true, message: 'Push subscription stored successfully' });

    } catch (error: any) {
      console.error('Error in push-subscriptions API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
      }

      // Get push subscription using service role
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error getting push subscription:', error);
        return res.status(500).json({ error: 'Failed to get push subscription' });
      }

      const subscription = data ? {
        userId: data.user_id,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.user_agent,
        platform: data.platform
      } : null;

      return res.status(200).json({ subscription });

    } catch (error: any) {
      console.error('Error in push-subscriptions GET API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
