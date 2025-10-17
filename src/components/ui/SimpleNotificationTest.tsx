'use client';

import React, { useState } from 'react';
import { notificationService } from '@/utils/notificationService';
import { Bell, Send, CheckCircle, XCircle } from 'lucide-react';

export const SimpleNotificationTest: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    timestamp: Date;
  } | null>(null);

  const testNotification = async () => {
    setIsTesting(true);
    setLastResult(null);

    try {
      console.log('🧪 Testing notification...');
      
      // Test basic notification
      const notification = await notificationService.showNotification({
        title: 'Test Notification',
        body: 'This is a test notification from the chat app',
        tag: 'test-notification',
        data: { type: 'test', timestamp: Date.now() }
      });

      if (notification) {
        setLastResult({
          success: true,
          message: 'Notification sent successfully!',
          timestamp: new Date()
        });
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          notification.close();
        }, 3000);
        
        console.log('✅ Notification sent successfully');
      } else {
        setLastResult({
          success: false,
          message: 'Failed to send notification',
          timestamp: new Date()
        });
        console.log('❌ Notification failed to send');
      }
    } catch (error) {
      setLastResult({
        success: false,
        message: `Error: ${error}`,
        timestamp: new Date()
      });
      console.error('❌ Notification error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const testChatNotification = async () => {
    setIsTesting(true);
    setLastResult(null);

    try {
      console.log('🧪 Testing chat notification...');
      
      const notification = await notificationService.showChatNotification(
        'Test User',
        'This is a test chat message for debugging',
        'test-user-123'
      );

      if (notification) {
        setLastResult({
          success: true,
          message: 'Chat notification sent successfully!',
          timestamp: new Date()
        });
        
        setTimeout(() => {
          notification.close();
        }, 3000);
        
        console.log('✅ Chat notification sent successfully');
      } else {
        setLastResult({
          success: false,
          message: 'Failed to send chat notification',
          timestamp: new Date()
        });
        console.log('❌ Chat notification failed to send');
      }
    } catch (error) {
      setLastResult({
        success: false,
        message: `Chat notification error: ${error}`,
        timestamp: new Date()
      });
      console.error('❌ Chat notification error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center space-x-2 mb-4">
        <Bell className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Quick Notification Test</h3>
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className={`mb-4 p-3 rounded-lg border ${
          lastResult.success 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center space-x-2">
            {lastResult.success ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm font-medium">{lastResult.message}</span>
          </div>
          <div className="text-xs opacity-75 mt-1">
            {lastResult.timestamp.toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={testNotification}
          disabled={isTesting}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Send className="w-4 h-4" />
          <span>{isTesting ? 'Testing...' : 'Test Basic Notification'}</span>
        </button>
        
        <button
          onClick={testChatNotification}
          disabled={isTesting}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Bell className="w-4 h-4" />
          <span>{isTesting ? 'Testing...' : 'Test Chat Notification'}</span>
        </button>
      </div>

      {/* Status Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600 space-y-1">
          <div>Permission: {notificationService.getPermission()}</div>
          <div>Can Notify: {notificationService.canNotify() ? 'Yes' : 'No'}</div>
          <div>Mobile: {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Yes' : 'No'}</div>
          <div>PWA: {window.matchMedia('(display-mode: standalone)').matches ? 'Yes' : 'No'}</div>
        </div>
      </div>
    </div>
  );
};
