import { NextApiRequest, NextApiResponse } from 'next';

// Firebase Admin SDK for sending FCM notifications
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields: token, title, body' });
    }

    // Validate FCM token format
    if (typeof token !== 'string' || token.length < 100) {
      console.error('❌ FCM API: Invalid token format - too short or not a string');
      return res.status(400).json({ 
        error: 'Invalid FCM token format',
        details: 'Token must be a string with at least 100 characters'
      });
    }

    // Note: Removed device ID check since FCM tokens can contain various characters

    console.log('🔔 FCM API: Sending FCM notification');
    console.log('   Token length:', token.length);
    console.log('   Token preview:', token.substring(0, 20) + '...');
    console.log('   Title:', title);
    console.log('   Body:', body);
    console.log('   Data:', data);
    console.log('   Firebase Admin SDK initialized:', admin.apps.length > 0);
    console.log('   Environment variables:');
    console.log('     FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set');
    console.log('     FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set');
    console.log('     FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Not set');

    // Create the FCM message
    const message = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: data || {},
      android: {
        notification: {
          icon: 'ic_launcher',
          color: '#6B7280',
          sound: 'default',
          channelId: 'chat_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Send the FCM notification
    const response = await admin.messaging().send(message);
    
    console.log('✅ FCM API: Successfully sent FCM notification:', response);
    
    return res.status(200).json({ 
      success: true, 
      messageId: response,
      message: 'FCM notification sent successfully' 
    });

  } catch (error) {
    console.error('❌ FCM API: Error sending FCM notification:', error);
    
    return res.status(500).json({ 
      error: 'Failed to send FCM notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
