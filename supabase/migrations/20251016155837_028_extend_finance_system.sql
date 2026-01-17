/*
  # Extended Finance System

  ## Overview
  Extends the existing finance system with comprehensive payout management, 
  KYC verification, fraud detection, and admin controls.

  ## Changes to Existing Tables

  ### Modified: `payout_requests`
  - Added new columns for enhanced payout management
  - Added fraud_score, kyc_verified, payout_method
  - Added admin review tracking
  
  ## New Tables
  
  ### 1. `system_settings`
  Global system configuration
  
  ### 2. `coin_transactions`
  Complete audit trail for all coin movements

  ### 3. `coin_purchases`
  Stripe payment tracking
  
  ### 4. `user_kyc_data`
  KYC verification information
  
  ### 5. `fraud_alerts`
  Automated fraud detection alerts
  
  ### 6. `payout_statistics`
  Aggregated payout metrics per user

  ## Security
  - RLS enabled on all tables
  - Sensitive data restricted to admins
  - Users can only access their own financial data
*/

-- ============================================================================
-- 1. SYSTEM SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can insert system settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
  ('coin_value_eur', '0.001', 'Current value of 1 coin in EUR'),
  ('payout_min_coins', '10000', 'Minimum coins for payout (€10 at default rate)'),
  ('payout_max_eur_per_request', '500', 'Maximum EUR per single payout'),
  ('payout_max_eur_per_month', '2000', 'Maximum EUR per month per user'),
  ('kyc_required_eur', '100', 'EUR amount requiring KYC verification'),
  ('tax_id_required_eur_per_year', '600', 'Yearly EUR amount requiring tax ID'),
  ('system_reserve_coins', '50000', 'Reserved coins for promotions/admin use')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2. COIN TRANSACTIONS TABLE (Complete audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  type text NOT NULL CHECK (type IN (
    'purchase', 'event_create', 'event_join', 'livestream', 
    'payout', 'bonus', 'promo', 'admin_award', 'refund', 'like_received'
  )),
  reference_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON coin_transactions(type);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created_at ON coin_transactions(created_at DESC);

ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coin transactions"
  ON coin_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all coin transactions"
  ON coin_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 3. COIN PURCHASES TABLE (Stripe tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS coin_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_id text UNIQUE,
  stripe_customer_id text,
  amount_eur decimal(10, 2) NOT NULL,
  coins_purchased integer NOT NULL,
  coin_rate decimal(10, 6) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'failed', 'refunded'
  )),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_coin_purchases_user_id ON coin_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_purchases_status ON coin_purchases(status);
CREATE INDEX IF NOT EXISTS idx_coin_purchases_created_at ON coin_purchases(created_at DESC);

ALTER TABLE coin_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON coin_purchases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all purchases"
  ON coin_purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 4. EXTEND PAYOUT REQUESTS TABLE
-- ============================================================================

-- Add new columns to existing payout_requests table
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payout_requests' AND column_name = 'coins_amount') THEN
    ALTER TABLE payout_requests ADD COLUMN coins_amount integer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payout_requests' AND column_name = 'eur_amount') THEN
    ALTER TABLE payout_requests ADD COLUMN eur_amount decimal(10, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payout_requests' AND column_name = 'coin_rate') THEN
    ALTER TABLE payout_requests ADD COLUMN coin_rate decimal(10, 6);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payout_requests' AND column_name = 'payout_method') THEN
    ALTER TABLE payout_requests ADD COLUMN payout_method text CHECK (payout_method IN ('paypal', 'bank_transfer'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payout_requests' AND column_name = 'payout_details') THEN
    ALTER TABLE payout_requests ADD COLUMN payout_details jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payout_requests' AND column_name = 'kyc_verified') THEN
    ALTER TABLE payout_requests ADD COLUMN kyc_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payout_requests' AND column_name = 'fraud_score') THEN
    ALTER TABLE payout_requests ADD COLUMN fraud_score integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payout_requests' AND column_name = 'notes') THEN
    ALTER TABLE payout_requests ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payout_requests' AND column_name = 'reviewed_by') THEN
    ALTER TABLE payout_requests ADD COLUMN reviewed_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payout_requests' AND column_name = 'reviewed_at') THEN
    ALTER TABLE payout_requests ADD COLUMN reviewed_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payout_requests' AND column_name = 'completed_at') THEN
    ALTER TABLE payout_requests ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Update status constraint if needed
DO $$
BEGIN
  ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_status_check;
  ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_status_check 
    CHECK (status IN ('pending', 'reviewing', 'approved', 'processing', 'completed', 'rejected', 'cancelled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add admin policies for payout_requests
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all payout requests" ON payout_requests;
  CREATE POLICY "Admins can view all payout requests"
    ON payout_requests FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );

  DROP POLICY IF EXISTS "Admins can update payout requests" ON payout_requests;
  CREATE POLICY "Admins can update payout requests"
    ON payout_requests FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. USER KYC DATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_kyc_data (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  address jsonb NOT NULL,
  date_of_birth date,
  id_document_type text CHECK (id_document_type IN ('passport', 'id_card', 'drivers_license')),
  id_document_number text,
  id_document_url text,
  tax_id text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN (
    'pending', 'verified', 'rejected'
  )),
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_kyc_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own KYC data"
  ON user_kyc_data FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own KYC data"
  ON user_kyc_data FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own KYC data"
  ON user_kyc_data FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all KYC data"
  ON user_kyc_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update all KYC data"
  ON user_kyc_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 6. FRAUD ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN (
    'fast_payout', 'chargeback_risk', 'multi_account', 'geo_conflict',
    'suspicious_pattern', 'high_amount', 'new_account_payout'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  score_impact integer NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_positive')),
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON fraud_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_created_at ON fraud_alerts(created_at DESC);

ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all fraud alerts"
  ON fraud_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage fraud alerts"
  ON fraud_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 7. PAYOUT STATISTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payout_statistics (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_payouts_eur decimal(10, 2) DEFAULT 0,
  total_payouts_count integer DEFAULT 0,
  this_month_eur decimal(10, 2) DEFAULT 0,
  this_year_eur decimal(10, 2) DEFAULT 0,
  last_payout_at timestamptz,
  average_days_between_payouts integer,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payout_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payout statistics"
  ON payout_statistics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all payout statistics"
  ON payout_statistics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 8. FUNCTIONS
-- ============================================================================

-- Function: Get current coin value in EUR
CREATE OR REPLACE FUNCTION get_coin_value()
RETURNS decimal AS $$
DECLARE
  coin_value decimal;
BEGIN
  SELECT (value::text)::decimal INTO coin_value
  FROM system_settings
  WHERE key = 'coin_value_eur';
  
  RETURN COALESCE(coin_value, 0.001);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Process coin transaction with balance tracking
CREATE OR REPLACE FUNCTION process_coin_transaction(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_reference_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_current_balance integer;
  v_new_balance integer;
  v_transaction_id uuid;
BEGIN
  -- Get current balance from user_stats
  SELECT COALESCE(total_coins, 0) INTO v_current_balance
  FROM user_stats
  WHERE user_id = p_user_id;
  
  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;
  
  -- Prevent negative balance for debits (except admin operations)
  IF v_new_balance < 0 AND p_type != 'admin_award' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance'
    );
  END IF;
  
  -- Create transaction record
  INSERT INTO coin_transactions (
    user_id, amount, balance_after, type, reference_id, metadata
  ) VALUES (
    p_user_id, p_amount, v_new_balance, p_type, p_reference_id, p_metadata
  ) RETURNING id INTO v_transaction_id;
  
  -- Update user_stats
  UPDATE user_stats
  SET 
    total_coins = v_new_balance,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate fraud score for user
CREATE OR REPLACE FUNCTION calculate_fraud_score(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_score integer := 0;
  v_account_age_days integer;
  v_first_purchase_date timestamptz;
  v_last_payout_date timestamptz;
  v_total_purchases_eur decimal;
  v_total_payouts_eur decimal;
BEGIN
  -- Get account age
  SELECT EXTRACT(DAY FROM (now() - created_at))::integer INTO v_account_age_days
  FROM profiles
  WHERE id = p_user_id;
  
  -- Get purchase/payout data
  SELECT 
    MIN(created_at),
    SUM(amount_eur)
  INTO v_first_purchase_date, v_total_purchases_eur
  FROM coin_purchases
  WHERE user_id = p_user_id AND status = 'completed';
  
  SELECT 
    MAX(created_at),
    SUM(eur_amount)
  INTO v_last_payout_date, v_total_payouts_eur
  FROM payout_requests
  WHERE user_id = p_user_id AND status = 'completed';
  
  -- Scoring logic
  
  -- New account (<7 days)
  IF v_account_age_days < 7 THEN
    v_score := v_score + 25;
  END IF;
  
  -- Fast payout (purchase to payout < 24 hours)
  IF v_first_purchase_date IS NOT NULL AND v_last_payout_date IS NOT NULL THEN
    IF EXTRACT(EPOCH FROM (v_last_payout_date - v_first_purchase_date)) < 86400 THEN
      v_score := v_score + 30;
    END IF;
  END IF;
  
  -- Payout > Purchase (potential fraud)
  IF COALESCE(v_total_payouts_eur, 0) > COALESCE(v_total_purchases_eur, 0) * 1.5 THEN
    v_score := v_score + 40;
  END IF;
  
  -- Add active fraud alerts
  SELECT COALESCE(SUM(score_impact), 0) + v_score INTO v_score
  FROM fraud_alerts
  WHERE user_id = p_user_id AND status = 'active';
  
  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Request payout (user-facing)
CREATE OR REPLACE FUNCTION request_payout(
  p_coins_amount integer,
  p_payout_method text,
  p_payout_details jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_current_balance integer;
  v_coin_value decimal;
  v_eur_amount decimal;
  v_min_coins integer;
  v_max_eur_per_request decimal;
  v_max_eur_per_month decimal;
  v_this_month_eur decimal;
  v_kyc_required_eur decimal;
  v_kyc_verified boolean;
  v_fraud_score integer;
  v_payout_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get settings
  SELECT (value::text)::decimal INTO v_coin_value FROM system_settings WHERE key = 'coin_value_eur';
  SELECT (value::text)::integer INTO v_min_coins FROM system_settings WHERE key = 'payout_min_coins';
  SELECT (value::text)::decimal INTO v_max_eur_per_request FROM system_settings WHERE key = 'payout_max_eur_per_request';
  SELECT (value::text)::decimal INTO v_max_eur_per_month FROM system_settings WHERE key = 'payout_max_eur_per_month';
  SELECT (value::text)::decimal INTO v_kyc_required_eur FROM system_settings WHERE key = 'kyc_required_eur';
  
  -- Calculate EUR amount
  v_eur_amount := p_coins_amount * v_coin_value;
  
  -- Get current balance
  SELECT COALESCE(total_coins, 0) INTO v_current_balance
  FROM user_stats
  WHERE user_id = v_user_id;
  
  -- Validation checks
  IF p_coins_amount < v_min_coins THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum payout is ' || v_min_coins || ' coins');
  END IF;
  
  IF p_coins_amount > v_current_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  IF v_eur_amount > v_max_eur_per_request THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum payout per request is €' || v_max_eur_per_request);
  END IF;
  
  -- Check monthly limit
  SELECT COALESCE(this_month_eur, 0) INTO v_this_month_eur
  FROM payout_statistics
  WHERE user_id = v_user_id;
  
  IF (v_this_month_eur + v_eur_amount) > v_max_eur_per_month THEN
    RETURN jsonb_build_object('success', false, 'error', 'Monthly limit of €' || v_max_eur_per_month || ' exceeded');
  END IF;
  
  -- Check KYC requirement
  IF v_eur_amount >= v_kyc_required_eur THEN
    SELECT verification_status = 'verified' INTO v_kyc_verified
    FROM user_kyc_data
    WHERE user_id = v_user_id;
    
    IF NOT COALESCE(v_kyc_verified, false) THEN
      RETURN jsonb_build_object('success', false, 'error', 'KYC verification required for payouts >= €' || v_kyc_required_eur, 'kyc_required', true);
    END IF;
  END IF;
  
  -- Calculate fraud score
  v_fraud_score := calculate_fraud_score(v_user_id);
  
  -- Create payout request
  INSERT INTO payout_requests (
    user_id, coins_amount, eur_amount, coin_rate, 
    payout_method, payout_details, kyc_verified, fraud_score
  ) VALUES (
    v_user_id, p_coins_amount, v_eur_amount, v_coin_value,
    p_payout_method, p_payout_details, COALESCE(v_kyc_verified, false), v_fraud_score
  ) RETURNING id INTO v_payout_id;
  
  -- Deduct coins from balance (held in payout request)
  PERFORM process_coin_transaction(
    v_user_id, 
    -p_coins_amount, 
    'payout', 
    v_payout_id,
    jsonb_build_object('payout_id', v_payout_id, 'eur_amount', v_eur_amount)
  );
  
  -- Create fraud alerts if score is high
  IF v_fraud_score >= 50 THEN
    INSERT INTO fraud_alerts (user_id, alert_type, severity, score_impact, details)
    VALUES (
      v_user_id, 
      'high_amount', 
      CASE WHEN v_fraud_score >= 75 THEN 'critical' ELSE 'high' END,
      v_fraud_score,
      jsonb_build_object('payout_id', v_payout_id, 'fraud_score', v_fraud_score)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'payout_id', v_payout_id,
    'eur_amount', v_eur_amount,
    'fraud_score', v_fraud_score
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get finance overview for admin dashboard
CREATE OR REPLACE FUNCTION get_finance_overview()
RETURNS jsonb AS $$
DECLARE
  v_total_coins_in_circulation integer;
  v_total_purchases_eur decimal;
  v_total_payouts_eur decimal;
  v_pending_payouts_count integer;
  v_pending_payouts_eur decimal;
  v_today_purchases_eur decimal;
  v_system_reserve integer;
BEGIN
  -- Check admin access
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get coins in circulation
  SELECT COALESCE(SUM(total_coins), 0) INTO v_total_coins_in_circulation
  FROM user_stats;
  
  -- Get system reserve
  SELECT (value::text)::integer INTO v_system_reserve
  FROM system_settings WHERE key = 'system_reserve_coins';
  
  -- Get purchase totals
  SELECT COALESCE(SUM(amount_eur), 0) INTO v_total_purchases_eur
  FROM coin_purchases WHERE status = 'completed';
  
  SELECT COALESCE(SUM(amount_eur), 0) INTO v_today_purchases_eur
  FROM coin_purchases 
  WHERE status = 'completed' 
  AND created_at >= CURRENT_DATE;
  
  -- Get payout totals
  SELECT COALESCE(SUM(eur_amount), 0) INTO v_total_payouts_eur
  FROM payout_requests WHERE status = 'completed';
  
  SELECT COUNT(*), COALESCE(SUM(eur_amount), 0) 
  INTO v_pending_payouts_count, v_pending_payouts_eur
  FROM payout_requests 
  WHERE status IN ('pending', 'reviewing');
  
  RETURN jsonb_build_object(
    'coins_in_circulation', v_total_coins_in_circulation,
    'system_reserve', v_system_reserve,
    'total_purchases_eur', v_total_purchases_eur,
    'total_payouts_eur', v_total_payouts_eur,
    'pending_payouts_count', v_pending_payouts_count,
    'pending_payouts_eur', v_pending_payouts_eur,
    'today_purchases_eur', v_today_purchases_eur,
    'net_revenue_eur', v_total_purchases_eur - v_total_payouts_eur
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
