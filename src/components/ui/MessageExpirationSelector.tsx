'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Shield, AlertTriangle, X } from 'lucide-react';

interface MessageExpirationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExpiration: (minutes: number | null) => void;
  currentExpiration?: number | null;
}

const EXPIRATION_OPTIONS = [
  { value: null, label: 'Never expire', icon: Shield, description: 'Messages will be kept forever' },
  { value: 5, label: '5 minutes', icon: Clock, description: 'Messages disappear after 5 minutes' },
  { value: 15, label: '15 minutes', icon: Clock, description: 'Messages disappear after 15 minutes' },
  { value: 30, label: '30 minutes', icon: Clock, description: 'Messages disappear after 30 minutes' },
  { value: 60, label: '1 hour', icon: Clock, description: 'Messages disappear after 1 hour' },
  { value: 240, label: '4 hours', icon: Clock, description: 'Messages disappear after 4 hours' },
  { value: 1440, label: '1 day', icon: Clock, description: 'Messages disappear after 1 day' },
  { value: 2880, label: '2 days', icon: Clock, description: 'Messages disappear after 2 days (default for files)' },
];

export const MessageExpirationSelector: React.FC<MessageExpirationSelectorProps> = ({
  isOpen,
  onClose,
  onSelectExpiration,
  currentExpiration
}) => {
  const [selectedExpiration, setSelectedExpiration] = useState<number | null>(currentExpiration || null);

  // Update selected expiration when currentExpiration changes
  useEffect(() => {
    setSelectedExpiration(currentExpiration || null);
  }, [currentExpiration]);

  const handleSelect = () => {
    onSelectExpiration(selectedExpiration);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Message Expiration</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose how long messages should last</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
          <div className="space-y-3">
            {EXPIRATION_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedExpiration === option.value;
              
              return (
                <button
                  key={option.value || 'never'}
                  onClick={() => setSelectedExpiration(option.value)}
                  className={`w-full flex items-center space-x-3 p-3 md:p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    isSelected
                      ? 'bg-blue-100 dark:bg-blue-800'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Icon size={18} className={
                      isSelected
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    } />
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${
                      isSelected
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {option.label}
                    </div>
                    <div className={`text-sm ${
                      isSelected
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {option.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Warning for files */}
          <div className="mt-4 md:mt-6 p-3 md:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  File Storage Notice
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Files are automatically deleted after 2 days by default, regardless of message expiration settings. 
                  This helps manage storage space.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Apply Expiration
          </button>
        </div>
      </div>
    </div>
  );
};
