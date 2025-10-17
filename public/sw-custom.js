// Custom service worker for PWA notifications
const CACHE_NAME = 'next-chat-v1';
const NOTIFICATION_TAG = 'next-chat-notification';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate');
  event.waitUntil(self.clients.claim());
});

// Handle push events for notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-72x72.png',
      tag: data.tag || NOTIFICATION_TAG,
      data: data.data,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200], // Vibration pattern for mobile
      actions: [
        {
          action: 'open',
          title: 'Open Chat'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => {
          console.log('Service Worker: Notification shown successfully');
        })
        .catch(error => {
          console.error('Service Worker: Error showing notification:', error);
        })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Handle notification click - focus or open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // If there's already a window open, focus it
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          const urlToOpen = event.notification.data?.url || '/chat';
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle background sync for offline messages
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle any pending operations when back online
      handleBackgroundSync()
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.action === 'closeNotificationsByTag') {
    self.registration.getNotifications({ tag: event.data.tag })
      .then(notifications => {
        notifications.forEach(notification => notification.close());
      });
  }
  
  if (event.data && event.data.action === 'showNotification') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Background sync handler
async function handleBackgroundSync() {
  try {
    // This is where you would handle any pending operations
    // like sending queued messages, syncing data, etc.
    console.log('Service Worker: Handling background sync');
  } catch (error) {
    console.error('Service Worker: Background sync error', error);
  }
}

// Cache management
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline');
        }
      })
  );
});
