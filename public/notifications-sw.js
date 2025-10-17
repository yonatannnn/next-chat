// Custom Notification Service Worker
// This file is separate from Next.js PWA and won't be overwritten

console.log('Notification Service Worker: Loading...');

// Handle notification messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Notification SW received message:', event.data);
  
  if (event.data && event.data.action === 'showNotification') {
    const { title, options } = event.data;
    console.log('Notification SW showing notification:', title);
    
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
    });
  }
  
  if (event.data && event.data.action === 'closeNotificationsByTag') {
    const { tag } = event.data;
    self.registration.getNotifications({ tag }).then(notifications => {
      notifications.forEach(notification => notification.close());
    });
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === self.registration.scope && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

console.log('Notification Service Worker: Ready');
