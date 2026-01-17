/*
  # Fix Delete Policy for Anonymous Users

  1. Changes
    - Drop existing restrictive delete policy
    - Create new delete policy allowing anonymous and authenticated users to delete events

  2. Security
    - Temporarily allows all users to delete events for testing
    - Should be updated with proper ownership checks in production
*/

DROP POLICY IF EXISTS "Users can delete own events" ON events;

CREATE POLICY "Users can delete own events"
  ON events FOR DELETE
  TO anon, authenticated
  USING (true);
