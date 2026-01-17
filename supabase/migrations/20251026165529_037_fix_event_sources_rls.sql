/*
  # Fix Event Sources RLS Policies

  1. Changes
    - Drop existing restrictive policies on event_sources
    - Add comprehensive policies for admins to manage event sources
    - Allow admins to INSERT, UPDATE, DELETE event sources
    - Allow admins to SELECT all event sources
  
  2. Security
    - Only admins (role = 'admin') can manage event sources
    - Regular users cannot access event_sources table
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage event sources" ON event_sources;
DROP POLICY IF EXISTS "Admins can view event sources" ON event_sources;
DROP POLICY IF EXISTS "Admins can create event sources" ON event_sources;
DROP POLICY IF EXISTS "Admins can update event sources" ON event_sources;
DROP POLICY IF EXISTS "Admins can delete event sources" ON event_sources;

-- Create comprehensive admin policies for event_sources
CREATE POLICY "Admins can view event sources"
  ON event_sources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create event sources"
  ON event_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update event sources"
  ON event_sources
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete event sources"
  ON event_sources
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
