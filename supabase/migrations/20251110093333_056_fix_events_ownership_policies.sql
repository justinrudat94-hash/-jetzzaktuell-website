/*
  # Fix Events Ownership Policies

  1. Security Changes
    - Drop and recreate DELETE policy to only allow creators to delete their own events
    - Ensure UPDATE policy properly checks ownership
    - Keep SELECT policies as they are (published events for everyone, own events for creators)
    - Keep INSERT policy open for event creation

  2. Changes
    - DELETE: Only the event creator (user_id or creator_id matches auth.uid()) can delete
    - UPDATE: Only the event creator (user_id or creator_id matches auth.uid()) can update
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;

-- Recreate DELETE policy with proper ownership check
CREATE POLICY "Users can delete own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    (user_id = (auth.uid())::text) OR (creator_id = auth.uid())
  );

-- Recreate UPDATE policy with proper ownership check
CREATE POLICY "Users can update own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    (user_id = (auth.uid())::text) OR (creator_id = auth.uid())
  )
  WITH CHECK (
    (user_id = (auth.uid())::text) OR (creator_id = auth.uid())
  );
