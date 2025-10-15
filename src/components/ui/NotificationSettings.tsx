import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { notificationService } from '@/utils/notificationService';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    setPermission(notificationService.getPermission());
  }, [isOpen]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const newPermission = await notificationService.requestPermission();
      setPermission(newPermission);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { text: 'Notifications enabled', color: 'text-green-600', icon: Check };
      case 'denied':
        return { text: 'Notifications blocked', color: 'text-red-600', icon: X };
      default:
        return { text: 'Permission not requested', color: 'text-gray-600', icon: Bell };
    }
  };

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <StatusIcon size={20} className={status.color} />
            <span className={status.color}>{status.text}</span>
          </div>

          {permission === 'default' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Enable notifications to get notified when you receive new messages.
              </p>
              <button
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Bell size={16} />
                <span>{isRequesting ? 'Requesting...' : 'Enable Notifications'}</span>
              </button>
            </div>
          )}

          {permission === 'granted' && (
            <div className="space-y-3">
              <p className="text-sm text-green-600">
                You'll receive notifications for new messages when the app is not in focus.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✓ Notifications are working properly
                </p>
              </div>
            </div>
          )}

          {permission === 'denied' && (
            <div className="space-y-3">
              <p className="text-sm text-red-600">
                Notifications are blocked. To enable them:
              </p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Click the notification icon in your browser's address bar</li>
                <li>Select "Allow" for notifications</li>
                <li>Refresh this page</li>
              </ol>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-2"
              >
                <BellOff size={16} />
                <span>Refresh Page</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
