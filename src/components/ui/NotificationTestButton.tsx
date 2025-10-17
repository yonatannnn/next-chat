'use client';

import { useState } from 'react';
import { Button } from './Button';
import { notificationService } from '@/utils/notificationService';

export function NotificationTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const testBasicNotification = async () => {
    setIsLoading(true);
    setLastResult('Testing basic notification...');
    
    try {
      const result = await notificationService.showNotification(
        'Test Notification',
        'This is a test notification from your chat app!',
        '/icons/icon-192x192.png'
      );
      
      setLastResult(result ? '✅ Basic notification sent!' : '❌ Basic notification failed');
    } catch (error) {
      setLastResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testChatNotification = async () => {
    setIsLoading(true);
    setLastResult('Testing chat notification...');
    
    try {
      const result = await notificationService.showNotification(
        'New Message from John',
        'Hey! How are you doing? This is a test message.',
        '/icons/icon-192x192.png',
        { 
          tag: 'chat-message',
          data: { 
            type: 'chat',
            senderId: 'test-sender',
            conversationId: 'test-conversation'
          }
        }
      );
      
      setLastResult(result ? '✅ Chat notification sent!' : '❌ Chat notification failed');
    } catch (error) {
      setLastResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPushSubscription = async () => {
    setIsLoading(true);
    setLastResult('Testing push subscription...');
    
    try {
      // Test if push is supported
      if (!notificationService.pushSupported) {
        setLastResult('❌ Push notifications not supported in this browser');
        setIsLoading(false);
        return;
      }

      // Test service worker registration
      if (!notificationService.registration) {
        setLastResult('❌ Service worker not registered');
        setIsLoading(false);
        return;
      }

      // Test push subscription
      const subscription = await notificationService.subscribeToPush();
      if (subscription) {
        setLastResult('✅ Push subscription created successfully!');
      } else {
        setLastResult('❌ Failed to create push subscription');
      }
    } catch (error) {
      setLastResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testServerPush = async () => {
    setIsLoading(true);
    setLastResult('Testing server push notification...');
    
    try {
      const response = await fetch('/api/test-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'test-user-id',
          title: 'Server Push Test',
          body: 'This is a test push notification from the server!'
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setLastResult('✅ Server push notification sent!');
      } else {
        setLastResult(`❌ Server push failed: ${result.error}`);
      }
    } catch (error) {
      setLastResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAPIEndpoint = async () => {
    setIsLoading(true);
    setLastResult('Testing API notification endpoint...');
    
    try {
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'API Test Notification',
          body: 'This notification was sent via API endpoint!',
          type: 'api-test'
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setLastResult('✅ API endpoint working! Now showing client notification...');
        
        // Show the actual notification on the client side
        try {
          await notificationService.showNotification(
            result.data.title,
            result.data.body,
            '/icons/icon-192x192.png',
            {
              tag: 'api-test-notification',
              data: { type: result.data.type }
            }
          );
          setLastResult('✅ API endpoint working + client notification shown!');
        } catch (notifError) {
          setLastResult('✅ API endpoint working, but client notification failed');
        }
      } else {
        setLastResult(`❌ API notification failed: ${result.error}`);
      }
    } catch (error) {
      setLastResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkNotificationPermission = () => {
    const permission = Notification.permission;
    setLastResult(`📱 Notification permission: ${permission}`);
  };

  const requestPermission = async () => {
    setIsLoading(true);
    setLastResult('Requesting notification permission...');
    
    try {
      const result = await notificationService.requestPermission();
      setLastResult(result ? '✅ Permission granted!' : '❌ Permission denied');
    } catch (error) {
      setLastResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">🔔 Notification Test</h3>
      
      <div className="space-y-2 mb-3">
        <Button
          onClick={checkNotificationPermission}
          disabled={isLoading}
          className="w-full text-sm"
        >
          Check Permission
        </Button>
        
        <Button
          onClick={requestPermission}
          disabled={isLoading}
          className="w-full text-sm bg-blue-500 hover:bg-blue-600"
        >
          Request Permission
        </Button>
        
        <Button
          onClick={testBasicNotification}
          disabled={isLoading}
          className="w-full text-sm bg-green-500 hover:bg-green-600"
        >
          Test Basic Notification
        </Button>
        
        <Button
          onClick={testChatNotification}
          disabled={isLoading}
          className="w-full text-sm bg-purple-500 hover:bg-purple-600"
        >
          Test Chat Notification
        </Button>
        
        <Button
          onClick={testPushSubscription}
          disabled={isLoading}
          className="w-full text-sm bg-orange-500 hover:bg-orange-600"
        >
          Test Push Subscription
        </Button>
        
        <Button
          onClick={testServerPush}
          disabled={isLoading}
          className="w-full text-sm bg-red-500 hover:bg-red-600"
        >
          Test Server Push
        </Button>
        
        <Button
          onClick={testAPIEndpoint}
          disabled={isLoading}
          className="w-full text-sm bg-indigo-500 hover:bg-indigo-600"
        >
          Test API Endpoint
        </Button>
      </div>
      
      {lastResult && (
        <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
          {lastResult}
        </div>
      )}
      
      {isLoading && (
        <div className="text-xs text-blue-600">
          ⏳ Loading...
        </div>
      )}
    </div>
  );
}
