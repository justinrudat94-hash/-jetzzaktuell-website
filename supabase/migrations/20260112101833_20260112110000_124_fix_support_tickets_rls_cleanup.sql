/*
  # Clean up and fix Support Tickets RLS Policies

  1. Changes
    - Remove all existing duplicate policies
    - Create clean, working policies for admins and users
    - Ensure proper access control

  2. Policies
    - Admins: Full access to all tickets
    - Users: Access to their own tickets only
    - Public: Access via access_token for email links
*/

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Admins can view all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Public can view tickets via access token" ON support_tickets;
DROP POLICY IF EXISTS "Users can update own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Public can view ticket with valid token" ON support_tickets;

-- Admin SELECT policy
CREATE POLICY "admin_select_all_tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admin UPDATE policy
CREATE POLICY "admin_update_all_tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- User SELECT own tickets
CREATE POLICY "user_select_own_tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- User INSERT own tickets
CREATE POLICY "user_insert_own_tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User UPDATE own tickets
CREATE POLICY "user_update_own_tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Public access via token (for email links without login)
CREATE POLICY "public_select_via_token"
  ON support_tickets FOR SELECT
  TO anon, authenticated
  USING (access_token IS NOT NULL);
