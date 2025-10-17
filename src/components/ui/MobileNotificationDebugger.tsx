'use client';

import React, { useState, useEffect } from 'react';
import { notificationService } from '@/utils/notificationService';
import { Bell, Smartphone, Wifi, WifiOff, CheckCircle, XCircle, AlertCircle, Bug, Send, TestTube } from 'lucide-react';

interface DebugStep {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp: Date;
}

export const MobileNotificationDebugger: React.FC = () => {
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isPWA: false,
    userAgent: '',
    platform: '',
    browser: '',
    isIOS: false,
    isAndroid: false,
    isChrome: false,
    isSafari: false
  });

  useEffect(() => {
    // Gather device information
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const pwa = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);
    const chrome = /Chrome/.test(navigator.userAgent);
    const safari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    setDeviceInfo({
      isMobile: mobile,
      isPWA: pwa,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      browser: chrome ? 'Chrome' : safari ? 'Safari' : 'Other',
      isIOS: ios,
      isAndroid: android,
      isChrome: chrome,
      isSafari: safari
    });
  }, []);

  const addDebugStep = (step: string, status: 'pending' | 'success' | 'error', message: string) => {
    const newStep: DebugStep = {
      step,
      status,
      message,
      timestamp: new Date()
    };
    setDebugSteps(prev => [...prev, newStep]);
  };

  const clearDebugSteps = () => {
    setDebugSteps([]);
  };

  const runFullNotificationTest = async () => {
    setIsRunning(true);
    clearDebugSteps();

    try {
      // Step 1: Check basic support
      addDebugStep('1', 'pending', 'Checking notification support...');
      const isSupported = 'Notification' in window;
      if (!isSupported) {
        addDebugStep('1', 'error', 'Notifications not supported in this browser');
        return;
      }
      addDebugStep('1', 'success', 'Notification API is supported');

      // Step 2: Check push support
      addDebugStep('2', 'pending', 'Checking push notification support...');
      const pushSupported = 'PushManager' in window && 'serviceWorker' in navigator;
      if (!pushSupported) {
        addDebugStep('2', 'error', 'Push notifications not supported');
      } else {
        addDebugStep('2', 'success', 'Push notifications are supported');
      }

      // Step 3: Check service worker support
      addDebugStep('3', 'pending', 'Checking service worker support...');
      const swSupported = 'serviceWorker' in navigator;
      if (!swSupported) {
        addDebugStep('3', 'error', 'Service worker not supported');
      } else {
        addDebugStep('3', 'success', 'Service worker is supported');
      }

      // Step 4: Check current permission
      addDebugStep('4', 'pending', 'Checking current notification permission...');
      const currentPermission = Notification.permission;
      addDebugStep('4', currentPermission === 'granted' ? 'success' : 'error', 
        `Current permission: ${currentPermission}`);

      // Step 5: Request permission if needed
      if (currentPermission !== 'granted') {
        addDebugStep('5', 'pending', 'Requesting notification permission...');
        const permission = await notificationService.requestPermission();
        addDebugStep('5', permission === 'granted' ? 'success' : 'error', 
          `Permission result: ${permission}`);
        
        if (permission !== 'granted') {
          addDebugStep('6', 'error', 'Permission denied - notifications will not work');
          return;
        }
      } else {
        addDebugStep('5', 'success', 'Permission already granted');
      }

      // Step 6: Test service worker registration
      addDebugStep('6', 'pending', 'Testing service worker registration...');
      try {
        const registration = await notificationService.registerServiceWorker();
        if (registration) {
          addDebugStep('6', 'success', 'Service worker registered successfully');
        } else {
          addDebugStep('6', 'error', 'Service worker registration failed');
        }
      } catch (error) {
        addDebugStep('6', 'error', `Service worker error: ${error}`);
      }

      // Step 7: Test push subscription
      if (pushSupported) {
        addDebugStep('7', 'pending', 'Testing push subscription...');
        try {
          const subscription = await notificationService.subscribeToPush();
          if (subscription) {
            addDebugStep('7', 'success', 'Push subscription created successfully');
            console.log('Push subscription details:', subscription);
          } else {
            addDebugStep('7', 'error', 'Push subscription failed');
          }
        } catch (error) {
          addDebugStep('7', 'error', `Push subscription error: ${error}`);
        }
      }

      // Step 8: Test direct notification
      addDebugStep('8', 'pending', 'Testing direct notification...');
      try {
        const notification = await notificationService.showNotification({
          title: 'Debug Test Notification',
          body: 'This is a test notification from the debugger',
          tag: 'debug-test',
          data: { type: 'debug', timestamp: Date.now() }
        });
        
        if (notification) {
          addDebugStep('8', 'success', 'Direct notification sent successfully');
          
          // Auto-close after 3 seconds
          setTimeout(() => {
            notification.close();
          }, 3000);
        } else {
          addDebugStep('8', 'error', 'Direct notification failed to send');
        }
      } catch (error) {
        addDebugStep('8', 'error', `Direct notification error: ${error}`);
      }

      // Step 9: Test push notification via service worker
      if (pushSupported) {
        addDebugStep('9', 'pending', 'Testing push notification via service worker...');
        try {
          const success = await notificationService.sendPushNotification({
            title: 'Debug Push Notification',
            body: 'This is a push notification test from the debugger',
            tag: 'debug-push-test',
            data: { type: 'debug-push', timestamp: Date.now() }
          });
          
          if (success) {
            addDebugStep('9', 'success', 'Push notification sent via service worker');
          } else {
            addDebugStep('9', 'error', 'Push notification via service worker failed');
          }
        } catch (error) {
          addDebugStep('9', 'error', `Push notification error: ${error}`);
        }
      }

      // Step 10: Test chat notification
      addDebugStep('10', 'pending', 'Testing chat notification...');
      try {
        const chatNotification = await notificationService.showChatNotification(
          'Debug User',
          'This is a test chat message for debugging notifications',
          'debug-user-123'
        );
        
        if (chatNotification) {
          addDebugStep('10', 'success', 'Chat notification sent successfully');
          
          // Auto-close after 3 seconds
          setTimeout(() => {
            chatNotification.close();
          }, 3000);
        } else {
          addDebugStep('10', 'error', 'Chat notification failed to send');
        }
      } catch (error) {
        addDebugStep('10', 'error', `Chat notification error: ${error}`);
      }

    } catch (error) {
      addDebugStep('ERROR', 'error', `Unexpected error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testSingleNotification = async () => {
    addDebugStep('SINGLE', 'pending', 'Sending single test notification...');
    try {
      const notification = await notificationService.showNotification({
        title: 'Single Test',
        body: 'Single notification test',
        tag: 'single-test'
      });
      
      if (notification) {
        addDebugStep('SINGLE', 'success', 'Single notification sent');
        setTimeout(() => notification.close(), 3000);
      } else {
        addDebugStep('SINGLE', 'error', 'Single notification failed');
      }
    } catch (error) {
      addDebugStep('SINGLE', 'error', `Single notification error: ${error}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-2xl">
      <div className="flex items-center space-x-2 mb-4">
        <Bug className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Mobile Notification Debugger</h3>
      </div>

      {/* Device Information */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Device Information:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
          <div>Mobile: {deviceInfo.isMobile ? 'Yes' : 'No'}</div>
          <div>PWA: {deviceInfo.isPWA ? 'Yes' : 'No'}</div>
          <div>Platform: {deviceInfo.platform}</div>
          <div>Browser: {deviceInfo.browser}</div>
          <div>iOS: {deviceInfo.isIOS ? 'Yes' : 'No'}</div>
          <div>Android: {deviceInfo.isAndroid ? 'Yes' : 'No'}</div>
        </div>
      </div>

      {/* Debug Steps */}
      {debugSteps.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Debug Steps:</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {debugSteps.map((step, index) => (
              <div
                key={index}
                className={`p-2 rounded border text-xs ${getStatusColor(step.status)}`}
              >
                <div className="flex items-center space-x-2">
                  {getStatusIcon(step.status)}
                  <span className="font-medium">Step {step.step}:</span>
                  <span>{step.message}</span>
                </div>
                <div className="text-xs opacity-75 mt-1">
                  {step.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={runFullNotificationTest}
          disabled={isRunning}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <TestTube className="w-4 h-4" />
          <span>{isRunning ? 'Running Full Test...' : 'Run Full Notification Test'}</span>
        </button>
        
        <button
          onClick={testSingleNotification}
          disabled={isRunning}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Send className="w-4 h-4" />
          <span>Test Single Notification</span>
        </button>
        
        <button
          onClick={clearDebugSteps}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Clear Debug Log
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Debug Instructions:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Click "Run Full Test" to test the complete notification flow</li>
          <li>• Check the debug steps to see where it fails</li>
          <li>• For iOS: Must be in PWA mode (add to home screen)</li>
          <li>• For Android: Works in Chrome browser or PWA</li>
          <li>• Check browser console for additional error details</li>
        </ul>
      </div>
    </div>
  );
};
