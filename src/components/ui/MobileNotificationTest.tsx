'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bell, BellOff, Smartphone, Monitor } from 'lucide-react';
import { notificationService } from '@/utils/notificationService';

export const MobileNotificationTest = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isTesting, setIsTesting] = useState(false);

  // Initialize permission on mount
  useEffect(() => {
    const currentPermission = notificationService.getPermission();
    setPermission(currentPermission);
  }, []);

  const checkPermission = () => {
    const currentPermission = notificationService.getPermission();
    setPermission(currentPermission);
    return currentPermission;
  };

  const requestPermission = async () => {
    setIsTesting(true);
    try {
      const newPermission = await notificationService.requestPermission();
      setPermission(newPermission);
      console.log('Permission result:', newPermission);
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const testNotification = async () => {
    if (!notificationService.canNotify()) {
      console.warn('Cannot send notification - permission not granted');
      return;
    }

    try {
      await notificationService.showChatNotification(
        'Test User',
        'This is a test notification to verify mobile notifications are working!',
        'test-user-id'
      );
      console.log('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  // Memoize environment detection to prevent re-renders
  const env = useMemo(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const hasServiceWorker = 'serviceWorker' in navigator;
    
    return {
      isMobile,
      isIOS,
      isAndroid,
      isPWA,
      hasServiceWorker,
      userAgent: navigator.userAgent
    };
  }, []); // Empty dependency array since these values don't change

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-center space-x-2 mb-3">
        <Bell className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Notification Test</h3>
      </div>

      <div className="space-y-3">
        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Permission:</span>
          <div className="flex items-center space-x-1">
            {permission === 'granted' ? (
              <Bell className="w-4 h-4 text-green-600" />
            ) : (
              <BellOff className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              permission === 'granted' ? 'text-green-600' : 'text-red-600'
            }`}>
              {permission}
            </span>
          </div>
        </div>

        {/* Environment Detection */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center space-x-2">
            {env.isMobile ? (
              <Smartphone className="w-3 h-3 text-blue-600" />
            ) : (
              <Monitor className="w-3 h-3 text-gray-400" />
            )}
            <span>{env.isMobile ? 'Mobile' : 'Desktop'}</span>
            {env.isPWA && <span className="text-blue-600">(PWA)</span>}
          </div>
          <div>SW: {env.hasServiceWorker ? '✅' : '❌'}</div>
          {env.isIOS && <div>iOS: ✅</div>}
          {env.isAndroid && <div>Android: ✅</div>}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {permission !== 'granted' && (
            <button
              onClick={requestPermission}
              disabled={isTesting}
              className="w-full bg-blue-600 text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isTesting ? 'Requesting...' : 'Request Permission'}
            </button>
          )}

          {permission === 'granted' && (
            <button
              onClick={testNotification}
              className="w-full bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Test Notification
            </button>
          )}
        </div>

        {/* Debug Info */}
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            Debug Info
          </summary>
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
            <div>User Agent: {env.userAgent.substring(0, 50)}...</div>
            <div>Service Worker: {env.hasServiceWorker ? 'Available' : 'Not Available'}</div>
            <div>PWA Mode: {env.isPWA ? 'Yes' : 'No'}</div>
            <div>Display Mode: {window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'}</div>
          </div>
        </details>
      </div>
    </div>
  );
};