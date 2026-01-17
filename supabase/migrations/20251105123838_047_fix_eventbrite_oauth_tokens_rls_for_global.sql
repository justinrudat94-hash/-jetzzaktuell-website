/*
  # Fix RLS Policies for Global Eventbrite OAuth Tokens

  1. Changes
    - Drop old policies that checked user_id = auth.uid()
    - Create new policies that allow admins to access global tokens (is_global = true)
    
  2. Security
    - Only admins can view/insert/update global OAuth tokens
    - Tokens with is_global = true are accessible to all admins
*/

-- Drop old policies
DROP POLICY IF EXISTS "Admins can view own OAuth tokens" ON eventbrite_oauth_tokens;
DROP POLICY IF EXISTS "Admins can insert own OAuth tokens" ON eventbrite_oauth_tokens;
DROP POLICY IF EXISTS "Admins can update own OAuth tokens" ON eventbrite_oauth_tokens;

-- Create new policies for global tokens
CREATE POLICY "Admins can view global OAuth tokens"
  ON eventbrite_oauth_tokens
  FOR SELECT
  TO authenticated
  USING (
    is_global = true 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert global OAuth tokens"
  ON eventbrite_oauth_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_global = true 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update global OAuth tokens"
  ON eventbrite_oauth_tokens
  FOR UPDATE
  TO authenticated
  USING (
    is_global = true 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    is_global = true 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete global OAuth tokens"
  ON eventbrite_oauth_tokens
  FOR DELETE
  TO authenticated
  USING (
    is_global = true 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );