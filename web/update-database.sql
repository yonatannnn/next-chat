-- Update the push_subscriptions table to use TEXT for user_id
-- This fixes the UUID issue with Firebase Auth UIDs

-- First, drop the existing table if it exists
DROP TABLE IF EXISTS push_subscriptions CASCADE;

-- Recreate the table with TEXT user_id
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Changed from UUID to TEXT to support Firebase Auth UIDs
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

-- Enable RLS (Row Level Security)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to access all subscriptions (for sending notifications)
CREATE POLICY "Service role can access all push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- For Firebase Auth users, disable RLS temporarily to allow all operations
-- This is needed because Firebase Auth UIDs don't match Supabase auth.uid()
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
