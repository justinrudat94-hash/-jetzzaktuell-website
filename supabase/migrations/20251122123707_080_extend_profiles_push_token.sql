/*
  # Extend profiles table for push notifications

  1. Changes
    - Add `push_token` (text) - Expo push notification token
    - Add `push_token_updated_at` (timestamptz) - When token was last updated

  2. Important Notes
    - Push tokens are device-specific and can change
    - Tokens should be refreshed periodically
    - Multiple devices = multiple tokens (future: separate table)
    - For MVP: Single token per user (latest device)
    - Phase 2: Create separate push_tokens table for multi-device support
*/

-- Add push notification token fields to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS push_token text,
  ADD COLUMN IF NOT EXISTS push_token_updated_at timestamptz;

-- Index for push token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_token 
  ON profiles(push_token) WHERE push_token IS NOT NULL;

COMMENT ON COLUMN profiles.push_token IS 'Expo push notification token for this user (latest device)';
COMMENT ON COLUMN profiles.push_token_updated_at IS 'Timestamp when push token was last updated';
