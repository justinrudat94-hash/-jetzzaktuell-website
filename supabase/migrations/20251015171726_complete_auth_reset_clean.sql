/*
  # Complete Auth System Reset - Clean State
  
  Resets the entire auth system back to a clean, simple, working state.
  
  1. Drops all existing triggers and functions
  2. Drops all existing tables (profiles, user_stats, etc.)
  3. Creates clean tables with minimal fields
  4. Sets up simple, working trigger
  5. Enables proper RLS policies
*/

-- =============================================
-- STEP 1: Clean up everything
-- =============================================

-- Drop all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_updated ON profiles;
DROP TRIGGER IF EXISTS update_user_stats_on_follow ON followers;
DROP TRIGGER IF EXISTS update_user_stats_on_unfollow ON followers;

-- Drop all functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_user_stats() CASCADE;
DROP FUNCTION IF EXISTS award_coins(uuid, integer, text) CASCADE;

-- Drop all tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS user_rewards CASCADE;
DROP TABLE IF EXISTS coin_transactions CASCADE;
DROP TABLE IF EXISTS followers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- =============================================
-- STEP 2: Create clean profiles table
-- =============================================

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  username text,
  name text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- STEP 3: Create clean user_stats table
-- =============================================

CREATE TABLE user_stats (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  events_count integer DEFAULT 0,
  coins integer DEFAULT 0,
  level integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- STEP 4: Create clean followers table
-- =============================================

CREATE TABLE followers (
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- =============================================
-- STEP 5: Create simple working trigger function
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, username, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', 'User')
  );
  
  -- Create stats
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- =============================================
-- STEP 6: Create trigger
-- =============================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================
-- STEP 7: Enable RLS
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 8: Create RLS Policies
-- =============================================

-- Profiles: Everyone can read, users can update their own
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User Stats: Everyone can read
CREATE POLICY "User stats are viewable by everyone"
  ON user_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Followers: Everyone can read, users can manage their own follows
CREATE POLICY "Followers are viewable by everyone"
  ON followers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON followers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others"
  ON followers FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- =============================================
-- STEP 9: Grant necessary permissions
-- =============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON user_stats TO authenticated;
GRANT ALL ON followers TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO postgres, service_role;
