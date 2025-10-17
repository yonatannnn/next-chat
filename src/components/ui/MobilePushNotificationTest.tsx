'use client';

import React, { useState, useEffect } from 'react';
import { notificationService } from '@/utils/notificationService';
import { Bell, Smartphone, Wifi, WifiOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const MobilePushNotificationTest: React.FC = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isMobile, setIsMobile] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<'not-supported' | 'registering' | 'registered' | 'error'>('not-supported');
  const [pushSupported, setPushSupported] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    // Check device and browser capabilities
    const checkCapabilities = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const pwa = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true;
      const push = 'PushManager' in window && 'serviceWorker' in navigator;
      
      setIsMobile(mobile);
      setIsPWA(pwa);
      setPushSupported(push);
      setIsSupported('Notification' in window);
      setPermission(Notification.permission);
    };

    checkCapabilities();

    // Check service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          setServiceWorkerStatus('registered');
        } else {
          setServiceWorkerStatus('not-supported');
        }
      }).catch(() => {
        setServiceWorkerStatus('error');
      });
    }
  }, []);

  const requestPermission = async () => {
    try {
      setTestResult('Requesting permission...');
      const newPermission = await notificationService.requestPermission();
      setPermission(newPermission);
      
      if (newPermission === 'granted') {
        setTestResult('✅ Permission granted! Setting up push notifications...');
        
        // Check if service worker is registered
        if ('serviceWorker' in navigator) {
          setServiceWorkerStatus('registering');
          try {
            const registration = await navigator.serviceWorker.ready;
            setServiceWorkerStatus('registered');
            setTestResult('✅ Service worker ready! Push notifications should work.');
          } catch (error) {
            setServiceWorkerStatus('error');
            setTestResult('❌ Service worker registration failed: ' + error);
          }
        }
      } else {
        setTestResult('❌ Permission denied. Notifications will not work.');
      }
    } catch (error) {
      setTestResult('❌ Error requesting permission: ' + error);
    }
  };

  const testNotification = async () => {
    try {
      setTestResult('Testing notification...');
      const notification = await notificationService.showNotification({
        title: 'Test Notification',
        body: 'This is a test notification for mobile devices',
        tag: 'test-notification'
      });
      
      if (notification) {
        setTestResult('✅ Test notification sent successfully!');
      } else {
        setTestResult('❌ Test notification failed to send.');
      }
    } catch (error) {
      setTestResult('❌ Error testing notification: ' + error);
    }
  };

  const testPushSubscription = async () => {
    try {
      setTestResult('Testing push subscription...');
      const subscription = await notificationService.getPushSubscription();
      
      if (subscription) {
        setTestResult('✅ Push subscription created successfully!');
        console.log('Push subscription:', subscription);
      } else {
        setTestResult('❌ Push subscription failed.');
      }
    } catch (error) {
      setTestResult('❌ Error creating push subscription: ' + error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'granted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'denied':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getServiceWorkerIcon = (status: string) => {
    switch (status) {
      case 'registered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'registering':
        return <Wifi className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex items-center space-x-2 mb-4">
        <Bell className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Mobile Push Notification Test</h3>
      </div>

      {/* Device Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-700">
            Device: {isMobile ? 'Mobile' : 'Desktop'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusIcon(permission)}
          <span className="text-sm text-gray-700">
            PWA Mode: {isPWA ? 'Yes' : 'No'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {getServiceWorkerIcon(serviceWorkerStatus)}
          <span className="text-sm text-gray-700">
            Service Worker: {serviceWorkerStatus}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {pushSupported ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
          <span className="text-sm text-gray-700">
            Push API: {pushSupported ? 'Supported' : 'Not Supported'}
          </span>
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{testResult}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={requestPermission}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Request Permission
        </button>
        
        <button
          onClick={testNotification}
          disabled={permission !== 'granted'}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Test Notification
        </button>
        
        <button
          onClick={testPushSubscription}
          disabled={!pushSupported || serviceWorkerStatus !== 'registered'}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Test Push Subscription
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Mobile Setup Instructions:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• For iOS: Add to Home Screen first</li>
          <li>• For Android: Install as PWA or use Chrome</li>
          <li>• Ensure notifications are enabled in browser settings</li>
          <li>• Test in production mode for best results</li>
        </ul>
      </div>
    </div>
  );
};
