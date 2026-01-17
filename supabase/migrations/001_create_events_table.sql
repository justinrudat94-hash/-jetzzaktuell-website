/*
  # Fix Events Table - Change user_id to TEXT

  ## Overview
  This migration fixes the events table by changing user_id from UUID to TEXT to support custom user IDs.

  ## Changes
  1. Drop existing RLS policies
  2. Change user_id column from UUID to TEXT
  3. Recreate RLS policies with text comparison

  ## Security
  - RLS remains enabled
  - Policies recreated to work with TEXT user_id
*/

-- Step 1: Drop all policies that depend on user_id
DROP POLICY IF EXISTS "Anyone can create events" ON events;
DROP POLICY IF EXISTS "Users can read own events" ON events;
DROP POLICY IF EXISTS "Users can insert own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Everyone can read published events" ON events;

-- Step 2: Change user_id from uuid to text
ALTER TABLE events ALTER COLUMN user_id TYPE text;

-- Step 3: Recreate policies with text comparison

-- Policy: Anyone can create events (including anonymous users)
CREATE POLICY "Anyone can create events"
  ON events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Users can read their own events
CREATE POLICY "Users can read own events"
  ON events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Policy: Users can insert their own events
CREATE POLICY "Users can insert own events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can update their own events
CREATE POLICY "Users can update own events"
  ON events FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can delete their own events
CREATE POLICY "Users can delete own events"
  ON events FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Policy: Everyone can read published events
CREATE POLICY "Everyone can read published events"
  ON events
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);
