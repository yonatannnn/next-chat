-- Update push_subscriptions table to support multiple devices per user
-- Remove the unique constraint on user_id to allow multiple devices
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

-- Add device_id column for multiple device support
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Create a unique constraint on user_id + device_id combination
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_device_unique 
  UNIQUE (user_id, device_id);

-- Update the index to include device_id
DROP INDEX IF EXISTS idx_push_subscriptions_user_id;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_device 
  ON push_subscriptions(user_id, device_id);

-- Update RLS policies to work with multiple devices
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Service role can access all push subscriptions" ON push_subscriptions;

-- Create new policies for multiple device support
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
  FOR ALL USING (true); -- Allow all authenticated users to manage subscriptions

CREATE POLICY "Service role can access all push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Add a function to clean up old subscriptions (optional)
CREATE OR REPLACE FUNCTION cleanup_old_push_subscriptions()
RETURNS void AS $$
BEGIN
  -- Delete subscriptions older than 30 days
  DELETE FROM push_subscriptions 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a function to get all subscriptions for a user
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(user_id_param TEXT)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  device_id TEXT,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  user_agent TEXT,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.user_id,
    ps.device_id,
    ps.endpoint,
    ps.p256dh,
    ps.auth,
    ps.user_agent,
    ps.platform,
    ps.created_at,
    ps.updated_at
  FROM push_subscriptions ps
  WHERE ps.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

