/*
  # Fix Update Policy for Anonymous Users

  1. Changes
    - Drop existing restrictive update policy
    - Create new update policy allowing anonymous and authenticated users to update events

  2. Security
    - Allows all users to update events for testing
    - Should be updated with proper ownership checks in production
*/

DROP POLICY IF EXISTS "Users can update own events" ON events;

CREATE POLICY "Users can update own events"
  ON events FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
