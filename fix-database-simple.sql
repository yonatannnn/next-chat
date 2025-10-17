-- Simple fix for push_subscriptions table
-- This disables RLS since we're using Firebase Auth with service role

-- Drop the existing table completely
DROP TABLE IF EXISTS push_subscriptions CASCADE;

-- Create the table without RLS (since we're using service role)
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Don't enable RLS since we're using service role for all operations
-- This avoids the auth.uid() vs Firebase UID mismatch issue
