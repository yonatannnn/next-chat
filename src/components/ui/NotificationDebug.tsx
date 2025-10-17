'use client';

import { useState, useEffect } from 'react';
import { notificationService } from '@/utils/notificationService';

export const NotificationDebug = () => {
  const [status, setStatus] = useState<any>({});

  useEffect(() => {
    const checkStatus = () => {
      setStatus({
        permission: notificationService.getPermission(),
        supported: 'Notification' in window,
        serviceWorker: 'serviceWorker' in navigator,
        isPWA: window.matchMedia('(display-mode: standalone)').matches,
        userAgent: navigator.userAgent,
        origin: window.location.origin,
        https: window.location.protocol === 'https:'
      });
    };

    checkStatus();
  }, []);

  const testNotification = async () => {
    console.log('Testing notification...');
    await notificationService.showChatNotification(
      'Test User', 
      'This is a test notification!', 
      'test-123'
    );
  };

  const requestPermission = async () => {
    console.log('Requesting permission...');
    const permission = await notificationService.requestPermission();
    console.log('Permission result:', permission);
    setStatus(prev => ({ ...prev, permission }));
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg max-w-md">
      <h3 className="font-bold mb-2">Notification Debug</h3>
      <pre className="text-xs mb-4">{JSON.stringify(status, null, 2)}</pre>
      <div className="space-y-2">
        <button 
          onClick={requestPermission}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded"
        >
          Request Permission
        </button>
        <button 
          onClick={testNotification}
          className="w-full px-4 py-2 bg-green-500 text-white rounded"
        >
          Test Notification
        </button>
      </div>
    </div>
  );
};