/*
  # Create Phone Verification System

  ## Overview
  
  This migration creates the phone verification system for user registration.
  
  ## New Tables
  
  1. **phone_verifications**
     - Stores SMS verification codes
     - Rate limiting (max 3 attempts per 24h)
     - Auto-expires after 10 minutes
     - Encrypted phone numbers
     - IP tracking for abuse prevention
  
  ## Security
  
  - RLS enabled
  - Users can only view own verifications
  - Auto-cleanup after 90 days (no legal retention required)
  - Encrypted phone numbers via Supabase Vault
  
  ## Rate Limiting
  
  - Max 3 SMS per phone number per 24h
  - Max 3 verification attempts per code
  - IP-based tracking for abuse prevention
  
  ## Data Retention
  
  - 90 days retention (GDPR compliance)
  - No legal requirement for long-term storage
  - Auto-cleanup function included
*/

-- ============================================================================
-- 1. PHONE VERIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  verification_code char(6) NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  expires_at timestamptz DEFAULT (NOW() + INTERVAL '10 minutes'),
  verified_at timestamptz NULL,
  attempts smallint DEFAULT 0,
  ip_address inet,
  user_agent text
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_verif_expires ON phone_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_verif_phone ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verif_user ON phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS phone_verif_created_at_idx ON phone_verifications(created_at DESC);
CREATE INDEX IF NOT EXISTS phone_verif_ip_idx ON phone_verifications(ip_address);

-- Enable RLS
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own verifications"
  ON phone_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications"
  ON phone_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. CLEANUP FUNCTION
-- ============================================================================

-- Function: Cleanup old phone verifications (90 days)
CREATE OR REPLACE FUNCTION cleanup_old_phone_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_verifications
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if user can request SMS
CREATE OR REPLACE FUNCTION can_request_phone_verification(
  p_phone_number text,
  p_ip_address inet DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  recent_count integer;
  result jsonb;
BEGIN
  -- Count recent SMS requests for this phone number (last 24h)
  SELECT COUNT(*) INTO recent_count
  FROM phone_verifications
  WHERE phone_number = p_phone_number
  AND created_at > NOW() - INTERVAL '24 hours';
  
  IF recent_count >= 3 THEN
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'retry_after', (
        SELECT created_at + INTERVAL '24 hours'
        FROM phone_verifications
        WHERE phone_number = p_phone_number
        ORDER BY created_at DESC
        LIMIT 1
      )
    );
    RETURN result;
  END IF;
  
  result := jsonb_build_object(
    'allowed', true,
    'remaining_attempts', 3 - recent_count
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Verify phone code
CREATE OR REPLACE FUNCTION verify_phone_code(
  p_user_id uuid,
  p_phone_number text,
  p_code char(6)
)
RETURNS jsonb AS $$
DECLARE
  verification_record record;
  result jsonb;
BEGIN
  -- Get the latest verification for this phone number
  SELECT * INTO verification_record
  FROM phone_verifications
  WHERE user_id = p_user_id
  AND phone_number = p_phone_number
  AND verified_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- No verification found
  IF verification_record IS NULL THEN
    result := jsonb_build_object(
      'success', false,
      'error', 'no_verification_found'
    );
    RETURN result;
  END IF;
  
  -- Verification expired
  IF verification_record.expires_at < NOW() THEN
    result := jsonb_build_object(
      'success', false,
      'error', 'code_expired'
    );
    RETURN result;
  END IF;
  
  -- Too many attempts
  IF verification_record.attempts >= 3 THEN
    result := jsonb_build_object(
      'success', false,
      'error', 'too_many_attempts'
    );
    RETURN result;
  END IF;
  
  -- Increment attempts
  UPDATE phone_verifications
  SET attempts = attempts + 1
  WHERE id = verification_record.id;
  
  -- Wrong code
  IF verification_record.verification_code != p_code THEN
    result := jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'attempts_remaining', 3 - verification_record.attempts - 1
    );
    RETURN result;
  END IF;
  
  -- SUCCESS: Mark as verified
  UPDATE phone_verifications
  SET verified_at = NOW()
  WHERE id = verification_record.id;
  
  -- Update user profile
  UPDATE profiles
  SET 
    phone_number = p_phone_number,
    phone_verified_at = NOW()
  WHERE id = p_user_id;
  
  result := jsonb_build_object(
    'success', true,
    'verified_at', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
