/*
  # Create notification preferences system

  1. New Tables
    - `notification_preferences`
      - `user_id` (uuid, primary key) - User's preferences
      - `all_notifications_enabled` (boolean) - Master toggle for all notifications
      
      -- Phase 1: MVP notification types
      - `new_follower_enabled` (boolean) - Notifications when someone follows user
      - `event_comment_enabled` (boolean) - Notifications for comments on user's events
      - `comment_reply_enabled` (boolean) - Notifications for replies to user's comments
      - `event_liked_enabled` (boolean) - Notifications when someone likes user's event
      
      -- Phase 2: Advanced notification types
      - `event_updated_enabled` (boolean) - Notifications for event updates
      - `event_cancelled_enabled` (boolean) - Notifications when event is cancelled
      - `event_live_enabled` (boolean) - Notifications when livestream goes live
      - `payout_completed_enabled` (boolean) - Notifications for completed payouts
      
      -- Timing preferences
      - `quiet_hours_start` (time) - Start of quiet hours (no notifications)
      - `quiet_hours_end` (time) - End of quiet hours
      - `timezone` (text) - User's timezone (e.g., 'Europe/Berlin')
      
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Trigger
    - Auto-create preferences with smart defaults when user is created

  3. Security
    - Enable RLS on `notification_preferences` table
    - Users can only view/update their own preferences

  4. Important Notes
    - Smart Defaults: Most notifications ON, event_liked OFF (can be spammy)
    - Quiet hours: 22:00 - 08:00 by default
    - Timezone: Defaults to 'Europe/Berlin', should be set by user
    - Master toggle overrides all individual settings
*/

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Master toggle
  all_notifications_enabled boolean DEFAULT true,
  
  -- Phase 1: MVP Types (Smart Defaults)
  new_follower_enabled boolean DEFAULT true,
  event_comment_enabled boolean DEFAULT true,
  comment_reply_enabled boolean DEFAULT true,
  event_liked_enabled boolean DEFAULT false,
  
  -- Phase 2: Advanced Types
  event_updated_enabled boolean DEFAULT true,
  event_cancelled_enabled boolean DEFAULT true,
  event_live_enabled boolean DEFAULT true,
  payout_completed_enabled boolean DEFAULT true,
  
  -- Timing preferences
  quiet_hours_start time DEFAULT '22:00:00',
  quiet_hours_end time DEFAULT '08:00:00',
  timezone text DEFAULT 'Europe/Berlin',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
  ON notification_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function: Auto-create preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Create preferences on user creation
DROP TRIGGER IF EXISTS on_user_created_notification_preferences ON auth.users;
CREATE TRIGGER on_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at
CREATE TRIGGER update_notification_preferences_timestamp
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

COMMENT ON TABLE notification_preferences IS 'User notification preferences with smart defaults';
COMMENT ON COLUMN notification_preferences.all_notifications_enabled IS 'Master toggle - overrides all individual settings';
COMMENT ON COLUMN notification_preferences.event_liked_enabled IS 'Default OFF - can be spammy';
COMMENT ON COLUMN notification_preferences.quiet_hours_start IS 'No notifications sent during quiet hours (user timezone)';
COMMENT ON COLUMN notification_preferences.timezone IS 'User timezone for quiet hours calculation (e.g., Europe/Berlin)';
