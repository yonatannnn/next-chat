'use client';

import { useEffect } from 'react';

export const ServiceWorkerRegistration: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          console.log('🔧 Registering service worker...');
          
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          
          console.log('🔧 Service worker registered successfully:', registration);
          
          // Handle service worker updates
          registration.addEventListener('updatefound', () => {
            console.log('🔧 Service worker update found');
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔧 New service worker installed, reloading page...');
                  window.location.reload();
                }
              });
            }
          });
          
          // Handle service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('🔧 Service worker message:', event.data);
          });
          
        } catch (error) {
          console.error('🔧 Service worker registration failed:', error);
        }
      };
      
      // Register service worker after a short delay to ensure page is loaded
      setTimeout(registerServiceWorker, 1000);
    }
  }, []);

  return null; // This component doesn't render anything
};
