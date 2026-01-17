/*
  # Create Notification and Tax Document Tables

  ## Overview
  
  This migration creates tables for:
  - Email notification queue
  - Two-factor authentication
  - Tax documents (10-year legal retention)
  
  ## New Tables
  
  1. **email_notifications_queue** - Queued email notifications
  2. **two_factor_verifications** - 2FA codes (SMS/TOTP)
  3. **payout_tax_documents** - Annual tax statements (§147 AO)
  
  ## Data Retention
  
  - email_notifications_queue: 30 days after sent
  - two_factor_verifications: 24 hours
  - payout_tax_documents: 10 years (LEGAL REQUIREMENT §147 AO)
  
  ## Security
  
  - RLS enabled on all tables
  - Users can only access own data
  - Tax documents permanently stored for legal compliance
*/

-- ============================================================================
-- 1. EMAIL NOTIFICATIONS QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN (
    'registration_success',
    'phone_verified',
    'payout_requested',
    'payout_completed',
    'account_suspended',
    'profile_picture_rejected',
    'gdpr_export_ready',
    'suspicious_login',
    'new_follower',
    'new_comment',
    'id_verification_required',
    'id_verification_completed'
  )),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  email_to text NOT NULL,
  subject text NOT NULL,
  data jsonb DEFAULT '{}',
  sent_at timestamptz NULL,
  failed_reason text NULL,
  retry_count smallint DEFAULT 0,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_queue_status_idx ON email_notifications_queue(status);
CREATE INDEX IF NOT EXISTS email_queue_created_idx ON email_notifications_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS email_queue_user_idx ON email_notifications_queue(user_id);

ALTER TABLE email_notifications_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email notifications"
  ON email_notifications_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. TWO FACTOR VERIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS two_factor_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  code char(6) NOT NULL,
  method text NOT NULL CHECK (method IN ('sms', 'totp')),
  verified boolean DEFAULT false,
  expires_at timestamptz DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS two_factor_user_idx ON two_factor_verifications(user_id);
CREATE INDEX IF NOT EXISTS two_factor_expires_idx ON two_factor_verifications(expires_at);

ALTER TABLE two_factor_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own 2FA verifications"
  ON two_factor_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2FA verifications"
  ON two_factor_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. PAYOUT TAX DOCUMENTS TABLE (10 YEAR RETENTION - LEGAL!)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payout_tax_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fiscal_year smallint NOT NULL,
  total_payouts_cents bigint NOT NULL,
  total_payouts_eur decimal(10,2) GENERATED ALWAYS AS (total_payouts_cents / 100.0) STORED,
  payout_count integer NOT NULL,
  document_url text NOT NULL,
  generated_at timestamptz DEFAULT NOW(),
  retention_until date GENERATED ALWAYS AS (
    make_date(fiscal_year, 12, 31) + INTERVAL '10 years'
  ) STORED,
  legal_hold boolean DEFAULT true,
  UNIQUE(user_id, fiscal_year)
);

CREATE INDEX IF NOT EXISTS tax_docs_user_idx ON payout_tax_documents(user_id);
CREATE INDEX IF NOT EXISTS tax_docs_year_idx ON payout_tax_documents(fiscal_year);
CREATE INDEX IF NOT EXISTS tax_docs_retention_idx ON payout_tax_documents(retention_until);

ALTER TABLE payout_tax_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tax documents"
  ON payout_tax_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id::uuid);

-- ============================================================================
-- 4. CLEANUP FUNCTIONS
-- ============================================================================

-- Function: Cleanup sent email notifications (30 days)
CREATE OR REPLACE FUNCTION cleanup_old_email_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM email_notifications_queue
  WHERE status = 'sent'
  AND sent_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cleanup old 2FA verifications (24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_two_factor_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM two_factor_verifications
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function: Queue email notification
CREATE OR REPLACE FUNCTION queue_email_notification(
  p_user_id uuid,
  p_notification_type text,
  p_subject text,
  p_data jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
  user_email text;
BEGIN
  -- Get user email
  SELECT email INTO user_email
  FROM profiles
  WHERE id = p_user_id;
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User email not found';
  END IF;
  
  -- Insert notification
  INSERT INTO email_notifications_queue (
    user_id,
    notification_type,
    email_to,
    subject,
    data
  )
  VALUES (
    p_user_id,
    p_notification_type,
    user_email,
    p_subject,
    p_data
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Verify 2FA code
CREATE OR REPLACE FUNCTION verify_two_factor_code(
  p_user_id uuid,
  p_code char(6)
)
RETURNS jsonb AS $$
DECLARE
  verification_record record;
  result jsonb;
BEGIN
  -- Get latest unverified code
  SELECT * INTO verification_record
  FROM two_factor_verifications
  WHERE user_id = p_user_id
  AND verified = false
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
  
  -- Code expired
  IF verification_record.expires_at < NOW() THEN
    result := jsonb_build_object(
      'success', false,
      'error', 'code_expired'
    );
    RETURN result;
  END IF;
  
  -- Wrong code
  IF verification_record.code != p_code THEN
    result := jsonb_build_object(
      'success', false,
      'error', 'invalid_code'
    );
    RETURN result;
  END IF;
  
  -- SUCCESS: Mark as verified
  UPDATE two_factor_verifications
  SET verified = true
  WHERE id = verification_record.id;
  
  result := jsonb_build_object(
    'success', true,
    'method', verification_record.method
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate annual tax document summary
CREATE OR REPLACE FUNCTION generate_tax_document_summary(
  p_user_id uuid,
  p_fiscal_year integer
)
RETURNS jsonb AS $$
DECLARE
  total_cents bigint;
  payout_cnt integer;
  result jsonb;
BEGIN
  -- Calculate totals from payout_requests
  SELECT 
    COALESCE(SUM(amount_coins * 100), 0),
    COUNT(*)
  INTO total_cents, payout_cnt
  FROM payout_requests
  WHERE user_id = p_user_id
  AND status = 'paid'
  AND EXTRACT(YEAR FROM processed_at) = p_fiscal_year;
  
  result := jsonb_build_object(
    'user_id', p_user_id,
    'fiscal_year', p_fiscal_year,
    'total_cents', total_cents,
    'total_eur', (total_cents / 100.0),
    'payout_count', payout_cnt
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
