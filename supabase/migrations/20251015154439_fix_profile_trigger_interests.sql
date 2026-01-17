/*
  # Fix Profile Creation Trigger
  
  Fixes the automatic profile creation to handle the interests field correctly
  and ensure all required fields are properly set.
*/

-- Drop and recreate the trigger function with correct field handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'birth_year')::integer, 2000),
    COALESCE(NEW.raw_user_meta_data->>'postcode', '00000'),
    COALESCE(NEW.raw_user_meta_data->>'city', 'Unknown'),
    '{}'::text[]
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
