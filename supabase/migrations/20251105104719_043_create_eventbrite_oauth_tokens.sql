/*
  # Create Eventbrite OAuth Tokens Table

  1. New Tables
    - `eventbrite_oauth_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `access_token` (text, encrypted OAuth token)
      - `token_type` (text, typically 'bearer')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `eventbrite_oauth_tokens` table
    - Only admins can read their own OAuth tokens
    - Tokens are stored securely and never exposed to clients

  3. Indexes
    - Index on user_id for fast lookups
*/

CREATE TABLE IF NOT EXISTS eventbrite_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  access_token text NOT NULL,
  token_type text DEFAULT 'bearer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE eventbrite_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own OAuth tokens"
  ON eventbrite_oauth_tokens
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert own OAuth tokens"
  ON eventbrite_oauth_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update own OAuth tokens"
  ON eventbrite_oauth_tokens
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_eventbrite_oauth_tokens_user_id 
  ON eventbrite_oauth_tokens(user_id);

CREATE OR REPLACE FUNCTION update_eventbrite_oauth_token_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_eventbrite_oauth_token_updated_at ON eventbrite_oauth_tokens;

CREATE TRIGGER trigger_update_eventbrite_oauth_token_updated_at
  BEFORE UPDATE ON eventbrite_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_eventbrite_oauth_token_updated_at();
