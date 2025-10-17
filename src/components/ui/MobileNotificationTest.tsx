'use client';

import React, { useState, useEffect } from 'react';
import { notificationService } from '@/utils/notificationService';

export const MobileNotificationTest: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [swStatus, setSwStatus] = useState<any>({});

  useEffect(() => {
    // Detect device and browser info
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);

    setDeviceInfo({
      userAgent,
      isMobile,
      isIOS,
      isAndroid,
      isSafari,
      isChrome,
      isPWA: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true,
      visibilityState: document.visibilityState,
      hasFocus: document.hasFocus()
    });

    // Check service worker status
    checkServiceWorkerStatus();
  }, []);

  const checkServiceWorkerStatus = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        const swInfo = {
          supported: true,
          registered: !!registration,
          active: !!registration?.active,
          scope: registration?.scope,
          state: registration?.active?.state
        };
        setSwStatus(swInfo);
      } else {
        setSwStatus({ supported: false });
      }
    } catch (error) {
      setSwStatus({ supported: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const testNotification = async () => {
    setIsTesting(true);
    setTestResult('');

    try {
      console.log('🧪 Testing mobile notification...');
      
      // Check all prerequisites
      const checks = {
        notificationSupport: 'Notification' in window,
        serviceWorkerSupport: 'serviceWorker' in navigator,
        pageVisible: document.visibilityState === 'visible',
        pageFocused: document.hasFocus(),
        permission: notificationService.getPermission(),
        isPWA: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true,
        userAgent: navigator.userAgent,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isAndroid: /Android/.test(navigator.userAgent)
      };

      console.log('🧪 Prerequisites:', checks);
      setTestResult(`Prerequisites: ${JSON.stringify(checks, null, 2)}\n\n`);

      // Request permission if needed
      if (checks.permission !== 'granted') {
        console.log('🧪 Requesting permission...');
        const newPermission = await notificationService.requestPermission();
        console.log('🧪 New permission:', newPermission);
        
        if (newPermission !== 'granted') {
          setTestResult(prev => prev + '❌ Permission denied. Please enable notifications in your browser settings.\n\n');
          setTestResult(prev => prev + '📱 Mobile-specific tips:\n');
          setTestResult(prev => prev + '- Make sure you\'re using a supported browser (Chrome, Firefox, Safari)\n');
          setTestResult(prev => prev + '- For iOS: Use Safari and ensure the site is added to home screen\n');
          setTestResult(prev => prev + '- For Android: Use Chrome and ensure notifications are enabled in browser settings\n');
          setTestResult(prev => prev + '- Try refreshing the page and granting permission again\n');
          return;
        }
      }

      // Test service worker status
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            setTestResult(prev => prev + `✅ Service Worker: Registered\n`);
            setTestResult(prev => prev + `   - Active: ${registration.active ? 'Yes' : 'No'}\n`);
            setTestResult(prev => prev + `   - State: ${registration.active?.state || 'N/A'}\n`);
          } else {
            setTestResult(prev => prev + `⚠️ Service Worker: Not registered\n`);
          }
        } catch (swError) {
          setTestResult(prev => prev + `❌ Service Worker Error: ${swError}\n`);
        }
      }

      // Test basic notification
      const notification = await notificationService.showNotification({
        title: 'Mobile Test Notification',
        body: 'This is a test notification for mobile devices',
        icon: '/icons/icon-192x192.png',
        tag: 'mobile-test-notification'
      });

      if (notification) {
        setTestResult(prev => prev + '✅ Test notification sent successfully!\n');
        console.log('🧪 Test notification created:', notification);
      } else {
        setTestResult(prev => prev + '⚠️ Notification handled by service worker\n');
        console.log('🧪 Notification handled by service worker');
      }

      // Additional mobile-specific checks
      setTestResult(prev => prev + '\n📱 Mobile-specific checks:\n');
      setTestResult(prev => prev + `- Page visibility: ${document.visibilityState}\n`);
      setTestResult(prev => prev + `- Page focused: ${document.hasFocus()}\n`);
      setTestResult(prev => prev + `- PWA mode: ${checks.isPWA}\n`);
      setTestResult(prev => prev + `- Device type: ${checks.isMobile ? 'Mobile' : 'Desktop'}\n`);

    } catch (error) {
      console.error('🧪 Test notification error:', error);
      setTestResult(prev => prev + `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    } finally {
      setIsTesting(false);
    }
  };

  const testServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('🧪 Service Worker registered:', registration);
          setTestResult(`✅ Service Worker Status:
- Registered: Yes
- Active: ${registration.active ? 'Yes' : 'No'}
- Scope: ${registration.scope}
- State: ${registration.active?.state || 'N/A'}`);
        } else {
          setTestResult('❌ No service worker registered');
        }
      } else {
        setTestResult('❌ Service Worker not supported');
      }
    } catch (error) {
      setTestResult(`❌ Service Worker error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const requestPermission = async () => {
    try {
      const permission = await notificationService.requestPermission();
      setTestResult(`Permission result: ${permission}`);
    } catch (error) {
      setTestResult(`Permission error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg max-w-md">
      <h3 className="text-lg font-semibold mb-4">📱 Mobile Notification Test</h3>
      
      <div className="space-y-3">
        <div className="text-xs bg-white p-2 rounded border">
          <h4 className="font-semibold mb-2">Device Info:</h4>
          <div className="space-y-1">
            <p><strong>Mobile:</strong> {deviceInfo.isMobile ? 'Yes' : 'No'}</p>
            <p><strong>iOS:</strong> {deviceInfo.isIOS ? 'Yes' : 'No'}</p>
            <p><strong>Android:</strong> {deviceInfo.isAndroid ? 'Yes' : 'No'}</p>
            <p><strong>Safari:</strong> {deviceInfo.isSafari ? 'Yes' : 'No'}</p>
            <p><strong>Chrome:</strong> {deviceInfo.isChrome ? 'Yes' : 'No'}</p>
            <p><strong>PWA Mode:</strong> {deviceInfo.isPWA ? 'Yes' : 'No'}</p>
            <p><strong>Page Visible:</strong> {deviceInfo.visibilityState}</p>
            <p><strong>Page Focused:</strong> {deviceInfo.hasFocus ? 'Yes' : 'No'}</p>
          </div>
        </div>

        <div className="text-xs bg-white p-2 rounded border">
          <h4 className="font-semibold mb-2">Service Worker:</h4>
          <div className="space-y-1">
            <p><strong>Supported:</strong> {swStatus.supported ? 'Yes' : 'No'}</p>
            <p><strong>Registered:</strong> {swStatus.registered ? 'Yes' : 'No'}</p>
            <p><strong>Active:</strong> {swStatus.active ? 'Yes' : 'No'}</p>
            <p><strong>State:</strong> {swStatus.state || 'N/A'}</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={testNotification}
            disabled={isTesting}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isTesting ? 'Testing...' : 'Test Mobile Notification'}
          </button>
          
          <button
            onClick={testServiceWorker}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Check Service Worker
          </button>

          <button
            onClick={requestPermission}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Request Permission
          </button>
        </div>
        
        {testResult && (
          <div className="p-3 bg-white rounded border">
            <pre className="text-xs whitespace-pre-wrap">{testResult}</pre>
          </div>
        )}
        
        <div className="text-xs text-gray-600">
          <p><strong>Permission:</strong> {notificationService.getPermission()}</p>
          <p><strong>Can Notify:</strong> {notificationService.canNotify() ? 'Yes' : 'No'}</p>
          <p><strong>Tab Focused:</strong> {notificationService.isTabFocused() ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
};
