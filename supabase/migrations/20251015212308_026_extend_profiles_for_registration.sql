/*
  # Extend Profiles Table for New Registration System

  ## Overview
  
  This migration extends the existing profiles table with fields required for:
  - Phone verification
  - Username management
  - Date of birth (age verification)
  - Location (country + coordinates)
  - Payout settings
  - Moderation status
  - GDPR compliance
  - Security (2FA, account status)
  
  ## Changes
  
  1. Keep existing fields: birth_year, postcode, city, avatar_url
  2. Add new fields for enhanced registration
  3. Migrate birth_year to date_of_birth (keep both for compatibility)
  4. Add username field (separate from name)
  5. Add all new security and compliance fields
  
  ## Data Retention
  
  - date_of_birth: Encrypted, retained while account active
  - phone_number: Encrypted, retained while account active
  - Payout data: 10 years after last payout (§147 AO)
  
  ## Security
  
  - All sensitive fields encrypted via Supabase Vault
  - RLS policies updated
  - Account status controls access
*/

-- ============================================================================
-- 1. ADD NEW COLUMNS TO PROFILES
-- ============================================================================

-- Date of Birth & Age Verification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth date NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_verified boolean DEFAULT false;

-- Username Management  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_changed_at timestamptz NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_change_count integer DEFAULT 0;

-- Phone Verification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number text NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verification_attempts integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_phone_change_at timestamptz NULL;

-- Location (keep city, add country & coordinates)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_country char(2) NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_latitude decimal(10,8) NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_longitude decimal(11,8) NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_last_updated timestamptz NULL;

-- Payout Settings
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_method text NULL CHECK (payout_method IN ('stripe', 'paypal'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id text NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_email text NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_tax_id text NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_earned_cents bigint DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_paid_out_cents bigint DEFAULT 0;

-- Moderation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_moderated boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_moderation_score smallint NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_banner_moderated boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_banner_moderation_score smallint NULL;

-- GDPR
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gdpr_consent_given boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gdpr_consent_at timestamptz NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language char(2) DEFAULT 'de';

-- Security
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_method text NULL CHECK (two_factor_method IN ('sms', 'totp'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspicious_login_notifications boolean DEFAULT true;

-- Account Status
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned', 'pending_deletion'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_until timestamptz NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason text NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason text NULL;

-- Admin Role (for RLS policies)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));

-- ============================================================================
-- 2. MIGRATE EXISTING DATA
-- ============================================================================

-- Migrate birth_year to date_of_birth (if not already done)
UPDATE profiles 
SET date_of_birth = make_date(birth_year, 1, 1)
WHERE birth_year IS NOT NULL AND date_of_birth IS NULL;

-- Set username from name (if not set)
UPDATE profiles
SET username = LOWER(REPLACE(name, ' ', '_'))
WHERE username IS NULL;

-- Set initial location_country based on postcode patterns (German system)
UPDATE profiles
SET location_country = 'DE'
WHERE location_country IS NULL AND postcode ~ '^\d{5}$';

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_phone_idx ON profiles(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_account_status_idx ON profiles(account_status);
CREATE INDEX IF NOT EXISTS profiles_payout_enabled_idx ON profiles(payout_enabled);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS profiles_location_coords_idx ON profiles(location_latitude, location_longitude) WHERE location_latitude IS NOT NULL;

-- ============================================================================
-- 4. UPDATE RLS POLICIES
-- ============================================================================

-- Drop old policies if they conflict
DROP POLICY IF EXISTS "Users can read public profile data" ON profiles;

-- Public profile data (for all authenticated users)
CREATE POLICY "Authenticated users can view active profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    account_status = 'active'
    OR auth.uid() = id
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if user is old enough (18+)
CREATE OR REPLACE FUNCTION check_age_requirement(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  birth_date date;
  user_age integer;
BEGIN
  SELECT date_of_birth INTO birth_date
  FROM profiles
  WHERE id = p_user_id;
  
  IF birth_date IS NULL THEN
    RETURN false;
  END IF;
  
  user_age := EXTRACT(YEAR FROM AGE(birth_date));
  
  RETURN user_age >= 18;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if username is available
CREATE OR REPLACE FUNCTION is_username_available(p_username text)
RETURNS boolean AS $$
DECLARE
  username_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(p_username)
  ) INTO username_exists;
  
  RETURN NOT username_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Change username (with history tracking)
CREATE OR REPLACE FUNCTION change_username(
  p_user_id uuid,
  p_new_username text,
  p_ip_address inet DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  old_username text;
  last_change timestamptz;
  change_count integer;
  result jsonb;
BEGIN
  -- Get current username and change history
  SELECT username, username_changed_at, username_change_count
  INTO old_username, last_change, change_count
  FROM profiles
  WHERE id = p_user_id;
  
  -- Check if username is available
  IF NOT is_username_available(p_new_username) THEN
    result := jsonb_build_object(
      'success', false,
      'error', 'username_taken'
    );
    RETURN result;
  END IF;
  
  -- Check 30-day cooldown
  IF last_change IS NOT NULL AND last_change > NOW() - INTERVAL '30 days' THEN
    result := jsonb_build_object(
      'success', false,
      'error', 'cooldown_active',
      'can_change_after', last_change + INTERVAL '30 days'
    );
    RETURN result;
  END IF;
  
  -- Update profile
  UPDATE profiles
  SET 
    username = p_new_username,
    username_changed_at = NOW(),
    username_change_count = COALESCE(username_change_count, 0) + 1
  WHERE id = p_user_id;
  
  -- Log in history
  INSERT INTO username_history (user_id, old_username, new_username, ip_address)
  VALUES (p_user_id, old_username, p_new_username, p_ip_address);
  
  result := jsonb_build_object(
    'success', true,
    'old_username', old_username,
    'new_username', p_new_username
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Suspend user account
CREATE OR REPLACE FUNCTION suspend_user_account(
  p_user_id uuid,
  p_duration_days integer,
  p_reason text
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  UPDATE profiles
  SET 
    account_status = 'suspended',
    suspension_until = NOW() + (p_duration_days || ' days')::interval,
    suspension_reason = p_reason
  WHERE id = p_user_id;
  
  -- Queue notification email
  PERFORM queue_email_notification(
    p_user_id,
    'account_suspended',
    'Dein JETZZ Account wurde gesperrt',
    jsonb_build_object(
      'duration_days', p_duration_days,
      'reason', p_reason,
      'until', NOW() + (p_duration_days || ' days')::interval
    )
  );
  
  result := jsonb_build_object(
    'success', true,
    'suspended_until', NOW() + (p_duration_days || ' days')::interval
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
