const webpush = require('web-push');

// Use your actual VAPID keys here
const vapidKeys = {
  publicKey: 'BPyk4E4ejKjRE1aYPFz7NwfYse_xhdOoBgZHjiwOz3AjTho8EtPxNvRnDFDCGBh3XKRzm5p55BdLhajnPpV4KRI',
  privateKey: 'IzG9CRovS6FAg7Ig_vZkZ0afpMoCnuHi37CAGqpPiHM'
};

webpush.setVapidDetails(
  'mailto:you@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Replace with the subscription object you got from the frontend
const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/...',
  keys: {
    auth: 'VyJj0b0_0VpTYA8Yk4n7wU8iU0V',
    p256dh: 'BEl62iUYgUivxIkv69yViEuiBIa40HI0lYbL1VU2XD0X8rVUuX8qVuYBTj3vU4d0y_0VpTYA8Yk4n7wU8iU0V'
  }
};

webpush.sendNotification(subscription, '🎉 Hello from Supabase Push Test!')
  .then(() => console.log('Notification sent!'))
  .catch(err => console.error('Error sending notification:', err));
