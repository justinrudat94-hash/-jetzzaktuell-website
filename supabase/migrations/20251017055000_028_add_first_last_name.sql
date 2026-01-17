/*
  # Add First Name and Last Name Fields

  ## Changes

  1. Add first_name and last_name columns to profiles table
    - `first_name` (text) - User's first name (not public)
    - `last_name` (text) - User's last name (not public)
    - Keep existing `name` field for compatibility (full name)

  2. Migrate existing name data
    - Split existing name into first_name and last_name where possible

  ## Privacy

  - first_name and last_name are private fields
  - Only username is displayed publicly
  - Full name only visible to admins and the user themselves
*/

-- Add first_name and last_name columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name text NULL;

-- Migrate existing name data (split by first space)
UPDATE profiles
SET
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = CASE
    WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE ''
  END
WHERE first_name IS NULL AND name IS NOT NULL;

-- Create index for search operations
CREATE INDEX IF NOT EXISTS profiles_first_name_idx ON profiles(first_name) WHERE first_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_last_name_idx ON profiles(last_name) WHERE last_name IS NOT NULL;
