/*
  # Fix Followers Table RLS for Public Counts

  1. Problem
    - HEAD requests for follower/following counts return 400 Bad Request
    - Current policies only allow authenticated users to view followers
    - Public profiles should be viewable by anyone
  
  2. Solution
    - Update SELECT policy to allow public (anon) access
    - This allows anyone to see follower relationships and counts
    - Maintains security for INSERT and DELETE operations
  
  3. Security
    - SELECT: Anyone (authenticated or anonymous) can view all follower relationships
    - INSERT: Only authenticated users can follow others
    - DELETE: Only authenticated users can unfollow
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view followers" ON followers;
DROP POLICY IF EXISTS "Users can follow others" ON followers;
DROP POLICY IF EXISTS "Users can unfollow" ON followers;

-- Allow anyone (including anonymous) to view follower relationships
CREATE POLICY "Public can view followers"
  ON followers
  FOR SELECT
  USING (true);

-- Only authenticated users can follow others
CREATE POLICY "Authenticated users can follow"
  ON followers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- Only authenticated users can unfollow
CREATE POLICY "Authenticated users can unfollow"
  ON followers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);