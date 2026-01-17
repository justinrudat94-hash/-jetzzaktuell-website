/*
  # Fix Followers Table - Add Missing ID Column

  1. Problem
    - The followers table is missing its primary key 'id' column
    - This causes 400 errors when queries try to SELECT id
    - The table was likely created without the id column in a previous migration
  
  2. Solution
    - Drop and recreate the followers table with proper schema
    - Add id as primary key
    - Maintain all foreign keys and constraints
    - Recreate indexes
    - Recreate RLS policies
  
  3. Security
    - SELECT: Anyone (anon + authenticated) can view followers
    - INSERT: Only authenticated users can create follows
    - DELETE: Only authenticated users can delete their own follows
*/

-- Drop existing table (no data to preserve based on count check)
DROP TABLE IF EXISTS followers CASCADE;

-- Create followers table with proper schema
CREATE TABLE followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "followers_select_policy"
  ON followers
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "followers_insert_policy"
  ON followers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "followers_delete_policy"
  ON followers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Create indexes for performance
CREATE INDEX followers_follower_id_idx ON followers(follower_id);
CREATE INDEX followers_following_id_idx ON followers(following_id);
CREATE INDEX followers_created_at_idx ON followers(created_at DESC);