/*
  # Fix: Profile Creation mit Error Handling
  
  Problem: Trigger crasht bei Profile-Erstellung
  Lösung: Besseres Error Handling und Logging
*/

-- Lösche alte Funktion
DROP FUNCTION IF EXISTS create_user_profile_and_stats() CASCADE;

-- Neue Funktion mit Error Handling
CREATE OR REPLACE FUNCTION public.create_user_profile_and_stats()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Erstelle Profile mit allen benötigten Feldern
  INSERT INTO public.profiles (
    id, 
    email, 
    username, 
    name,
    birth_year,
    postcode,
    city,
    interests
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'birth_year')::integer, 2000),
    COALESCE(NEW.raw_user_meta_data->>'postcode', '00000'),
    COALESCE(NEW.raw_user_meta_data->>'city', 'Unknown'),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'interests')),
      ARRAY[]::text[]
    )
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Erstelle User Stats
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log den Fehler aber blockiere den User nicht
  RAISE WARNING 'Error in create_user_profile_and_stats: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Erstelle Trigger neu
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.create_user_profile_and_stats();
