/*
  # Fix recursive RLS policies in profiles table

  1. Changes
    - Drop policies that cause recursion
    - Create new policies that use stored role information without recursion
  
  2. Security
    - Maintains admin access
    - Prevents infinite recursion
    - Uses simpler policy checks
*/

-- Drop problematic recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create function to check if user is admin (uses raw_app_metadata)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('admin', 'moderator'),
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate admin policies without recursion
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
