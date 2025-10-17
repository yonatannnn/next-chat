'use client';

import { useEffect } from 'react';

export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          console.log('Registering service worker...');
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          
          console.log('Service Worker registered successfully:', registration);
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            console.log('Service Worker update found');
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New service worker installed, reloading...');
                  window.location.reload();
                }
              });
            }
          });
          
          // Handle service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('Message from service worker:', event.data);
          });
          
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };

      // Register service worker
      registerServiceWorker();
    }
  }, []);

  return null;
};