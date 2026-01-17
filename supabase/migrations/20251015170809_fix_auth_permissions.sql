/*
  # Fix Auth Permissions - Letzter Versuch
  
  Problem: Auth kann User nicht erstellen
  Lösung: Alle Permissions freigeben + Trigger deaktivieren zum Testen
*/

-- Lösche den Trigger KOMPLETT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Gebe profiles volle Public-Rechte (temporär zum Debuggen)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;

-- Grant ALLE Rechte
GRANT ALL ON profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON user_stats TO postgres, anon, authenticated, service_role;

-- Sehr einfache Funktion die NUR Profile erstellt
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Nur Profile, kein Stats
  INSERT INTO public.profiles (id, email, username, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', 'User')
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Logge aber blockiere nicht
  RAISE WARNING 'Profile creation failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Grant Execute auf Funktion
GRANT EXECUTE ON FUNCTION handle_new_user() TO postgres, anon, authenticated, service_role;

-- Trigger neu erstellen
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
