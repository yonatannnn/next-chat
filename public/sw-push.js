// Push Notification Service Worker
console.log('Push Notification Service Worker: Loading...');

// Handle push events for mobile notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const options = {
      body: data.body || 'New message received',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-72x72.png',
      tag: data.tag || 'chat-notification',
      data: data.data || {},
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 200], // Enhanced vibration pattern
      timestamp: Date.now(),
      renotify: true,
      dir: 'ltr',
      lang: 'en',
      image: data.image, // Support for large images
      actions: [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/icons/reply-icon.svg'
        },
        {
          action: 'view',
          title: 'View Chat',
          icon: '/icons/chat-icon.svg'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss-icon.svg'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'New Message', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  switch (event.action) {
    case 'reply':
    case 'view':
      // Open the chat page
      event.waitUntil(
        clients.openWindow('/chat')
      );
      break;
    case 'dismiss':
      // Just close the notification (already closed above)
      break;
    default:
      // Default action - open chat
      event.waitUntil(
        clients.openWindow('/chat')
      );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.action === 'showNotification') {
    const { title, options } = event.data;
    console.log('Service Worker showing notification:', title);
    
    event.waitUntil(
      self.registration.showNotification(title, {
        ...options,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/icon-72x72.png',
        requireInteraction: true,
        silent: false,
        vibrate: options.vibrate || [200, 100, 200],
        actions: options.actions || [
          {
            action: 'open',
            title: 'Open Chat'
          },
          {
            action: 'close',
            title: 'Dismiss'
          }
        ]
      })
    );
  }
  
  if (event.data && event.data.action === 'closeNotificationsByTag') {
    const { tag } = event.data;
    self.registration.getNotifications({ tag }).then(notifications => {
      notifications.forEach(notification => notification.close());
    });
  }
});

// Handle background sync for offline messages
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);
  
  if (event.tag === 'send-message') {
    event.waitUntil(
      // Handle offline message sending
      console.log('Syncing offline messages...')
    );
  }
});

// Handle install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Handle activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});
