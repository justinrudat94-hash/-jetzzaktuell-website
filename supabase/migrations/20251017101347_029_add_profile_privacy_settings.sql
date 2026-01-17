/*
  # Add Profile Privacy Settings

  1. Changes
    - Add `show_real_name` column to profiles table
      - Boolean field to control whether full name is visible to other users
      - Defaults to FALSE (privacy-first approach)
      - When FALSE: only username and optional first name are shown
      - When TRUE: full name (first_name + last_name) is shown
    
  2. Notes
    - created_at already exists, will be used for "Member since" display
    - This gives users full control over their privacy
    - Default is privacy-focused (name hidden by default)
*/

-- Add privacy setting for name visibility
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS show_real_name BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN profiles.show_real_name IS 'Controls whether full name is visible to other users. Default: false (privacy-first)';