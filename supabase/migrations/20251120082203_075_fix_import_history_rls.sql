/*
  # Fix Import History RLS Policies

  1. Changes
    - Add INSERT policy for admins to create import records
    - Add UPDATE policy for admins to update import records
    - Keep SELECT policy for admins to view records

  2. Security
    - Only admins can insert/update/view import history
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view import history" ON ticketmaster_import_history;
DROP POLICY IF EXISTS "Service role can manage import history" ON ticketmaster_import_history;

-- Create new policies for admins
CREATE POLICY "Admins can view import history"
  ON ticketmaster_import_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert import history"
  ON ticketmaster_import_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update import history"
  ON ticketmaster_import_history
  FOR UPDATE
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
