/*
  # Create in-app notifications system - Part 1: Core table

  1. New Tables
    - `in_app_notifications`
      - `id` (uuid, primary key) - Unique notification identifier
      - `user_id` (uuid, foreign key) - Recipient of the notification
      - `actor_id` (uuid, foreign key) - User who triggered the notification
      - `notification_type` (text) - Type of notification (new_follower, event_liked, etc.)
      - `target_type` (text) - Type of target entity (event, user, comment, livestream)
      - `target_id` (uuid) - ID of the target entity
      - `title` (text) - Notification title
      - `message` (text) - Notification message
      - `data` (jsonb) - Additional metadata
      - `is_read` (boolean) - Whether notification has been read
      - `created_at` (timestamptz) - Creation timestamp

  2. Indexes
    - `idx_notifications_user_id_is_read` - Fast unread count queries
    - `idx_notifications_user_id_created_at` - Fast list queries with pagination
    - `idx_notifications_notification_type` - Statistics and analytics
    - `idx_notifications_target` - Finding notifications for specific targets

  3. Security
    - Enable RLS on `in_app_notifications` table
    - Users can only view their own notifications
    - Users can update only their own notifications (mark as read)
    - Users can delete their own notifications

  4. Important Notes
    - All notification types supported: new_follower, event_liked, event_comment, 
      comment_reply, event_updated, event_cancelled, event_live, payout_completed
    - Target types: event, user, comment, livestream
    - Data field stores additional context (e.g., event title, comment preview)
    - Created_at used for sorting and cleanup (30 days read, 90 days unread)
*/

-- Create in_app_notifications table
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (
    notification_type IN (
      'new_follower',
      'event_liked',
      'event_comment',
      'comment_reply',
      'event_updated',
      'event_cancelled',
      'event_live',
      'payout_completed'
    )
  ),
  target_type text NOT NULL CHECK (
    target_type IN ('event', 'user', 'comment', 'livestream')
  ),
  target_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read 
  ON in_app_notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at 
  ON in_app_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_notification_type 
  ON in_app_notifications(notification_type);

CREATE INDEX IF NOT EXISTS idx_notifications_target 
  ON in_app_notifications(target_type, target_id);

-- Enable Row Level Security
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON in_app_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON in_app_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON in_app_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: System can insert notifications (via functions with SECURITY DEFINER)
CREATE POLICY "System can insert notifications"
  ON in_app_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE in_app_notifications IS 'In-app notifications for user activities and updates';
COMMENT ON COLUMN in_app_notifications.notification_type IS 'Type: new_follower, event_liked, event_comment, comment_reply, event_updated, event_cancelled, event_live, payout_completed';
COMMENT ON COLUMN in_app_notifications.target_type IS 'Target entity type: event, user, comment, livestream';
COMMENT ON COLUMN in_app_notifications.data IS 'Additional metadata (event_title, comment_text, changed_fields, etc.)';
