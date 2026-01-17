/*
  # Clean Up Duplicate Followers Policies

  1. Problem
    - Multiple conflicting policies exist on the followers table
    - Some policies apply only to authenticated, others to public
    - HEAD requests still failing with 400 errors
  
  2. Solution
    - Drop ALL existing policies
    - Create clean, minimal policies
    - Ensure anon users can read (for HEAD requests)
    - Only authenticated users can modify
  
  3. Security
    - SELECT: Anyone (including anon) can view followers
    - INSERT: Only authenticated users can create follows
    - DELETE: Only authenticated users can delete their own follows
*/

-- Drop ALL existing policies on followers table
DROP POLICY IF EXISTS "Anyone can view followers" ON followers;
DROP POLICY IF EXISTS "Public can view followers" ON followers;
DROP POLICY IF EXISTS "Followers are viewable by everyone" ON followers;
DROP POLICY IF EXISTS "Users can follow others" ON followers;
DROP POLICY IF EXISTS "Authenticated users can follow" ON followers;
DROP POLICY IF EXISTS "Users can unfollow" ON followers;
DROP POLICY IF EXISTS "Users can unfollow others" ON followers;
DROP POLICY IF EXISTS "Authenticated users can unfollow" ON followers;

-- Create fresh policies with correct access
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