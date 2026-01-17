/*
  # Add Profile Banner Fields

  ## Changes

  1. Add banner image fields to profiles table
    - `banner_url` (text) - Public storage URL for banner image
    - `banner_image_url` (text) - Alternative field name for compatibility
    - `banner_moderated` (boolean) - Moderation status flag
    - `banner_moderation_score` (smallint) - AI moderation score (0-100)
    - `banner_status` (text) - Status: pending, approved, rejected

  2. Update existing moderation fields for consistency

  ## Security

  - Banner images go through same moderation as profile pictures
  - RLS policies already cover these fields via existing profile policies
*/

-- Add banner image fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url text NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_image_url text NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_moderated boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_moderation_score smallint NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_status text DEFAULT 'approved' CHECK (banner_status IN ('pending', 'approved', 'rejected'));

-- Add missing profile picture status field (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_status text DEFAULT 'approved' CHECK (profile_picture_status IN ('pending', 'approved', 'rejected'));

-- Create indexes for moderation queries
CREATE INDEX IF NOT EXISTS profiles_banner_status_idx ON profiles(banner_status) WHERE banner_status = 'pending';
CREATE INDEX IF NOT EXISTS profiles_picture_status_idx ON profiles(profile_picture_status) WHERE profile_picture_status = 'pending';
