/*
  # Add RLS Policies for Support Tickets

  1. Security Changes
    - Add RLS policies for `support_tickets` table to allow proper access control
    - Admins can view and manage all tickets
    - Users can view and create their own tickets
    - Public access via `access_token` for email links

  2. Policies Created
    - Admins can view all tickets
    - Admins can update all tickets
    - Users can view their own tickets
    - Users can create their own tickets
    - Public can view tickets via access_token
    - Users can update their own tickets
*/

-- Drop any existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Public can view tickets via access token" ON support_tickets;
DROP POLICY IF EXISTS "Users can update own support tickets" ON support_tickets;

-- Admin policies: Full access to all tickets
CREATE POLICY "Admins can view all support tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update all support tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- User policies: Access to own tickets
CREATE POLICY "Users can view own support tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own support tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own support tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Public access via access_token (for email links)
-- This allows users to access their tickets via email links without logging in
CREATE POLICY "Public can view tickets via access token"
  ON support_tickets FOR SELECT
  TO anon, authenticated
  USING (access_token IS NOT NULL);
