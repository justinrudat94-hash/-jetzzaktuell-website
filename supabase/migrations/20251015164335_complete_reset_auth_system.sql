/*
  # KOMPLETTER RESET - Einfaches Auth System
  
  Entfernt alle komplizierten Trigger und macht es EINFACH:
  - Profile wird manuell erstellt (kein Auto-Trigger)
  - User Stats werden manuell erstellt
  - Keine Konflikte mehr
*/

-- 1. Lösche ALLE Trigger auf auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_user_stats ON auth.users;

-- 2. Lösche ALLE Trigger auf profiles
DROP TRIGGER IF EXISTS on_profile_created ON profiles;

-- 3. Lösche die alten Funktionen
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS initialize_user_stats() CASCADE;
DROP FUNCTION IF EXISTS update_user_stats() CASCADE;

-- 4. Mache profiles Felder OPTIONAL (damit es nicht crasht)
ALTER TABLE profiles 
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN birth_year DROP NOT NULL,
  ALTER COLUMN postcode DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL;

-- 5. Setze Default-Werte
ALTER TABLE profiles 
  ALTER COLUMN name SET DEFAULT 'User',
  ALTER COLUMN birth_year SET DEFAULT 2000,
  ALTER COLUMN postcode SET DEFAULT '00000',
  ALTER COLUMN city SET DEFAULT 'Unknown',
  ALTER COLUMN interests SET DEFAULT '{}';

-- 6. EINE EINFACHE Funktion die alles macht
CREATE OR REPLACE FUNCTION public.create_user_profile_and_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Erstelle Profile
  INSERT INTO public.profiles (id, email, username, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Erstelle User Stats
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. EIN Trigger der alles macht
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.create_user_profile_and_stats();
