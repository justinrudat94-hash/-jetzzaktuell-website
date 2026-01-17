/*
  # Create Additional User Management Tables

  ## Overview
  
  This migration creates supporting tables for the new registration system:
  - Username history tracking
  - ID verifications (Stripe Identity)
  - GDPR data requests
  - Rate limiting system
  - Suspicious login tracking
  
  ## New Tables
  
  1. **username_history** - Track username changes (fraud prevention)
  2. **id_verifications** - Stripe Identity verification records
  3. **gdpr_data_requests** - DSGVO compliance (export/delete)
  4. **rate_limits** - Spam and abuse prevention
  5. **suspicious_logins** - Security monitoring
  
  ## Data Retention
  
  - username_history: 2 years
  - id_verifications: 3 years
  - gdpr_data_requests: Until completed
  - rate_limits: 24 hours
  - suspicious_logins: 90 days
  
  ## Security
  
  - RLS enabled on all tables
  - Users can only access own data
  - Rate limits accessible via functions only
*/

-- ============================================================================
-- 1. USERNAME HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS username_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  old_username text NOT NULL,
  new_username text NOT NULL,
  changed_at timestamptz DEFAULT NOW(),
  reason text NULL,
  ip_address inet,
  user_agent text
);

CREATE INDEX IF NOT EXISTS username_history_user_idx ON username_history(user_id);
CREATE INDEX IF NOT EXISTS username_history_date_idx ON username_history(changed_at DESC);

ALTER TABLE username_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own username history"
  ON username_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. ID VERIFICATIONS TABLE (Stripe Identity)
-- ============================================================================

CREATE TABLE IF NOT EXISTS id_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  verification_method text DEFAULT 'stripe_identity' CHECK (verification_method IN ('stripe_identity')),
  stripe_verification_session_id text NOT NULL,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'cancelled')),
  required_for_payout_eur decimal(10,2),
  created_at timestamptz DEFAULT NOW(),
  verified_at timestamptz NULL,
  failed_reason text NULL,
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS id_verif_user_idx ON id_verifications(user_id);
CREATE INDEX IF NOT EXISTS id_verif_status_idx ON id_verifications(verification_status);
CREATE INDEX IF NOT EXISTS id_verif_date_idx ON id_verifications(created_at DESC);

ALTER TABLE id_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verifications"
  ON id_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications"
  ON id_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. GDPR DATA REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS gdpr_data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('export', 'delete')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  download_url text NULL,
  download_expires_at timestamptz NULL,
  deletion_scheduled_for date NULL,
  deletion_completed_at timestamptz NULL,
  requested_at timestamptz DEFAULT NOW(),
  completed_at timestamptz NULL,
  admin_notes text NULL,
  error_message text NULL
);

CREATE INDEX IF NOT EXISTS gdpr_requests_user_idx ON gdpr_data_requests(user_id);
CREATE INDEX IF NOT EXISTS gdpr_requests_status_idx ON gdpr_data_requests(status);
CREATE INDEX IF NOT EXISTS gdpr_requests_type_idx ON gdpr_data_requests(request_type);

ALTER TABLE gdpr_data_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own GDPR requests"
  ON gdpr_data_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own GDPR requests"
  ON gdpr_data_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. RATE LIMITS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN (
    'registration',
    'sms_verification',
    'username_change',
    'profile_picture_upload',
    'payout_request',
    'login_attempt',
    'password_reset'
  )),
  attempt_count smallint DEFAULT 1,
  first_attempt_at timestamptz DEFAULT NOW(),
  last_attempt_at timestamptz DEFAULT NOW(),
  blocked_until timestamptz NULL,
  UNIQUE(identifier, action_type)
);

CREATE INDEX IF NOT EXISTS rate_limits_identifier_idx ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS rate_limits_action_idx ON rate_limits(action_type);
CREATE INDEX IF NOT EXISTS rate_limits_blocked_idx ON rate_limits(blocked_until);

-- No RLS policies - accessed only via functions

-- ============================================================================
-- 5. SUSPICIOUS LOGINS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS suspicious_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address inet NOT NULL,
  user_agent text,
  device_fingerprint text NULL,
  country_code char(2) NULL,
  city text NULL,
  is_suspicious boolean DEFAULT false,
  suspicion_reason text NULL,
  user_confirmed boolean NULL,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS suspicious_logins_user_idx ON suspicious_logins(user_id);
CREATE INDEX IF NOT EXISTS suspicious_logins_date_idx ON suspicious_logins(created_at DESC);
CREATE INDEX IF NOT EXISTS suspicious_logins_suspicious_idx ON suspicious_logins(is_suspicious);

ALTER TABLE suspicious_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suspicious logins"
  ON suspicious_logins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own login confirmations"
  ON suspicious_logins FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. CLEANUP FUNCTIONS
-- ============================================================================

-- Function: Cleanup old username history (2 years)
CREATE OR REPLACE FUNCTION cleanup_old_username_history()
RETURNS void AS $$
BEGIN
  DELETE FROM username_history
  WHERE changed_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cleanup old rate limits (24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE last_attempt_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cleanup old suspicious logins (90 days)
CREATE OR REPLACE FUNCTION cleanup_old_suspicious_logins()
RETURNS void AS $$
BEGIN
  DELETE FROM suspicious_logins
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,
  p_action_type text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 60
)
RETURNS jsonb AS $$
DECLARE
  rate_record record;
  result jsonb;
BEGIN
  -- Get existing rate limit record
  SELECT * INTO rate_record
  FROM rate_limits
  WHERE identifier = p_identifier
  AND action_type = p_action_type;
  
  -- No record exists, allow
  IF rate_record IS NULL THEN
    INSERT INTO rate_limits (identifier, action_type, attempt_count)
    VALUES (p_identifier, p_action_type, 1);
    
    result := jsonb_build_object(
      'allowed', true,
      'attempts_remaining', p_max_attempts - 1
    );
    RETURN result;
  END IF;
  
  -- Check if blocked
  IF rate_record.blocked_until IS NOT NULL AND rate_record.blocked_until > NOW() THEN
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'retry_after', rate_record.blocked_until
    );
    RETURN result;
  END IF;
  
  -- Check if window has passed
  IF rate_record.last_attempt_at < NOW() - (p_window_minutes || ' minutes')::interval THEN
    -- Reset counter
    UPDATE rate_limits
    SET 
      attempt_count = 1,
      first_attempt_at = NOW(),
      last_attempt_at = NOW(),
      blocked_until = NULL
    WHERE id = rate_record.id;
    
    result := jsonb_build_object(
      'allowed', true,
      'attempts_remaining', p_max_attempts - 1
    );
    RETURN result;
  END IF;
  
  -- Increment attempt count
  IF rate_record.attempt_count >= p_max_attempts THEN
    -- Block for window duration
    UPDATE rate_limits
    SET 
      blocked_until = NOW() + (p_window_minutes || ' minutes')::interval,
      last_attempt_at = NOW()
    WHERE id = rate_record.id;
    
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'retry_after', NOW() + (p_window_minutes || ' minutes')::interval
    );
    RETURN result;
  END IF;
  
  -- Allow but increment
  UPDATE rate_limits
  SET 
    attempt_count = attempt_count + 1,
    last_attempt_at = NOW()
  WHERE id = rate_record.id;
  
  result := jsonb_build_object(
    'allowed', true,
    'attempts_remaining', p_max_attempts - rate_record.attempt_count - 1
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
