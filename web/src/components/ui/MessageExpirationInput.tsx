'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Shield, AlertTriangle, X, Save, Trash2 } from 'lucide-react';

interface MessageExpirationInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpiration: (minutes: number | null) => void;
  currentExpiration?: number | null;
}

export const MessageExpirationInput: React.FC<MessageExpirationInputProps> = ({
  isOpen,
  onClose,
  onSaveExpiration,
  currentExpiration
}) => {
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<'never' | 'custom'>('never');
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      if (currentExpiration && currentExpiration > 0) {
        setCustomMinutes(currentExpiration.toString());
        setSelectedOption('custom');
      } else {
        setCustomMinutes('');
        setSelectedOption('never');
      }
      setErrors([]);
    }
  }, [isOpen, currentExpiration]);

  const validateInput = (value: string): string[] => {
    const errors: string[] = [];
    
    if (value.trim() === '') {
      errors.push('Please enter a value');
      return errors;
    }

    const num = parseInt(value, 10);
    
    if (isNaN(num)) {
      errors.push('Please enter a valid number');
    } else if (num < 1) {
      errors.push('Value must be at least 1 minute');
    } else if (num > 10080) { // 7 days in minutes
      errors.push('Maximum value is 10,080 minutes (7 days)');
    }

    return errors;
  };

  const handleCustomChange = (value: string) => {
    setCustomMinutes(value);
    setErrors([]);
  };

  const handleSave = () => {
    if (selectedOption === 'never') {
      onSaveExpiration(null);
      onClose();
      return;
    }

    const validationErrors = validateInput(customMinutes);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const minutes = parseInt(customMinutes, 10);
    onSaveExpiration(minutes);
    onClose();
  };

  const handleClear = () => {
    setCustomMinutes('');
    setSelectedOption('never');
    setErrors([]);
  };

  const formatCurrentExpiration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Set how long messages should last</p>
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
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            {/* Current Setting Display */}
            {currentExpiration && currentExpiration > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock size={16} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Current setting: {formatCurrentExpiration(currentExpiration)}
                  </span>
                </div>
              </div>
            )}

            {/* Never Expire Option */}
            <div className="space-y-3">
              <button
                onClick={() => setSelectedOption('never')}
                className={`w-full flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                  selectedOption === 'never'
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  selectedOption === 'never'
                    ? 'bg-blue-100 dark:bg-blue-800'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Shield size={18} className={
                    selectedOption === 'never'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  } />
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-medium ${
                    selectedOption === 'never'
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    Never expire
                  </div>
                  <div className={`text-sm ${
                    selectedOption === 'never'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    Messages will be kept forever
                  </div>
                </div>
                {selectedOption === 'never' && (
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                )}
              </button>

              {/* Custom Input Option */}
              <button
                onClick={() => setSelectedOption('custom')}
                className={`w-full flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                  selectedOption === 'custom'
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  selectedOption === 'custom'
                    ? 'bg-blue-100 dark:bg-blue-800'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Clock size={18} className={
                    selectedOption === 'custom'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  } />
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-medium ${
                    selectedOption === 'custom'
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    Custom time
                  </div>
                  <div className={`text-sm ${
                    selectedOption === 'custom'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    Enter minutes (1-10,080)
                  </div>
                </div>
                {selectedOption === 'custom' && (
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                )}
              </button>
            </div>

            {/* Custom Input Field */}
            {selectedOption === 'custom' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expiration time (minutes)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="10080"
                    value={customMinutes}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    placeholder="Enter minutes (e.g., 30, 60, 1440)"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleClear}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    title="Clear"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {/* Error Messages */}
                {errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
                        <AlertTriangle size={14} />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Help Text */}
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Examples: 5 (5 minutes), 60 (1 hour), 1440 (1 day), 10080 (7 days)
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Important Notice
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Once set, all new messages in this chat will automatically expire after the specified time. 
                    This setting only affects new messages, not existing ones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <Save size={16} />
            <span>Save Setting</span>
          </button>
        </div>
      </div>
    </div>
  );
};
