/*
  # Kompletter Auth System Reset
  
  1. Löscht alle bestehenden Auth-Strukturen
  2. Erstellt saubere profiles Tabelle
  3. Erstellt user_stats Tabelle
  4. Erstellt einfachen Trigger für neue User
  5. Setzt korrekte RLS Policies
*/

-- ============================================
-- STEP 1: Cleanup - Alles löschen
-- ============================================

-- Lösche alle Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_initialize_coin_balance ON profiles;

-- Lösche alle Funktionen
DROP FUNCTION IF EXISTS create_user_profile_and_stats() CASCADE;
DROP FUNCTION IF EXISTS initialize_coin_balance() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Lösche Tabellen (CASCADE löscht auch Foreign Keys)
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- STEP 2: Erstelle profiles Tabelle
-- ============================================

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  username text UNIQUE,
  name text DEFAULT 'User',
  birth_year integer DEFAULT 2000,
  postcode text DEFAULT '00000',
  city text DEFAULT 'Unknown',
  avatar_url text,
  interests text[] DEFAULT '{}',
  is_guest boolean DEFAULT false,
  level integer DEFAULT 1,
  role text DEFAULT 'user',
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- STEP 3: Erstelle user_stats Tabelle
-- ============================================

CREATE TABLE user_stats (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  follower_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  event_count integer DEFAULT 0,
  coins integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- STEP 4: RLS Policies
-- ============================================

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User Stats RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stats are viewable by everyone"
  ON user_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- STEP 5: Einfacher Trigger für neue User
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Erstelle Profile
  INSERT INTO public.profiles (id, email, username, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', 'User')
  );
  
  -- Erstelle User Stats
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Erstelle Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STEP 6: Indizes für Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
