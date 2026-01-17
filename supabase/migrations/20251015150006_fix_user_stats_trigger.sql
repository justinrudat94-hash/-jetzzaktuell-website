/*
  # Fix User Stats Trigger

  Fixes the create_user_stats trigger function that uses wrong field name.
  Changes NEW.user_id to NEW.id to match auth.users table structure.
*/

-- Drop and recreate the function with correct field reference
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
