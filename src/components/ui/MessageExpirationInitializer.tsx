'use client';

import { useEffect } from 'react';
import { messageExpirationService } from '@/services/messageExpirationService';

export const MessageExpirationInitializer: React.FC = () => {
  useEffect(() => {
    // Start the message expiration cleanup service when the app loads
    messageExpirationService.startCleanupService();

    // Clean up on unmount
    return () => {
      messageExpirationService.stopCleanupService();
    };
  }, []);

  // This component doesn't render anything
  return null;
};
