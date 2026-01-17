/*
  # Create Followers Table

  1. New Tables
    - `followers`
      - `id` (uuid, primary key)
      - `follower_id` (uuid, references profiles.id) - User who follows
      - `following_id` (uuid, references profiles.id) - User being followed
      - `created_at` (timestamptz, when the follow happened)

  2. Constraints
    - Unique constraint to prevent duplicate follows
    - Check constraint to prevent self-following

  3. Security
    - Enable RLS on `followers` table
    - Users can read all follower relationships
    - Users can only create follows for themselves (follower_id = auth.uid())
    - Users can only delete their own follows

  4. Indexes
    - Index on follower_id for fast "who am I following" queries
    - Index on following_id for fast "who follows me" queries
*/

-- Create followers table
CREATE TABLE IF NOT EXISTS followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view followers" ON followers;
DROP POLICY IF EXISTS "Users can follow others" ON followers;
DROP POLICY IF EXISTS "Users can unfollow" ON followers;

-- RLS Policies
CREATE POLICY "Anyone can view followers"
  ON followers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON followers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON followers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS followers_follower_id_idx ON followers(follower_id);
CREATE INDEX IF NOT EXISTS followers_following_id_idx ON followers(following_id);
CREATE INDEX IF NOT EXISTS followers_created_at_idx ON followers(created_at DESC);
