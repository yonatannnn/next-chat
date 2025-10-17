'use client';

import { useEffect } from 'react';

export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Just log that service worker is supported, don't register
      console.log('Service Worker support detected');
    }
  }, []);

  return null;
};