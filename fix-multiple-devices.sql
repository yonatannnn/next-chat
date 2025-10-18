-- Fix for multiple device support
-- This allows multiple push subscriptions per user (one per device)

-- Drop the existing table
DROP TABLE IF EXISTS push_subscriptions CASCADE;

-- Create the table with support for multiple devices per user
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL, -- Unique identifier for each device
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_id) -- Allow multiple devices per user
);

-- Create index for faster lookups
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_device_id ON push_subscriptions(device_id);

-- Don't enable RLS since we're using service role for all operations
-- This avoids the auth.uid() vs Firebase UID mismatch issue
