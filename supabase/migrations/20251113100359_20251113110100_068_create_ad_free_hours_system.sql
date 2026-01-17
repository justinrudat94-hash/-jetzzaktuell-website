/*
  # Create Ad-Free Hours System

  1. New Tables
    - `ad_free_hours`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `hours_balance` (decimal) - Current ad-free hours balance
      - `daily_earned_hours` (decimal) - Hours earned today
      - `total_earned_hours` (decimal) - Lifetime earned hours
      - `last_reset_date` (date) - Last daily reset
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `ad_free_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `transaction_type` (text: 'earn' | 'spend' | 'expire')
      - `hours_amount` (decimal)
      - `source` (text: 'rewarded_ad' | 'bonus' | 'usage')
      - `description` (text)
      - `created_at` (timestamptz)

  2. Settings
    - Max 2 hours earnable per day via rewarded ads
    - Ad-free hours expire after 30 days
    - 1 rewarded ad = 10 minutes (0.167 hours)

  3. Security
    - Enable RLS on all tables
    - Users can only access their own data

  4. Functions
    - `get_ad_free_balance(user_id)` - Get current ad-free hours
    - `add_ad_free_hours(user_id, hours, source)` - Add hours to balance
    - `consume_ad_free_hours(user_id, hours)` - Use hours
    - `reset_daily_limit()` - Reset daily earned counter (cron job)
*/

-- Create ad_free_hours table
CREATE TABLE IF NOT EXISTS ad_free_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  hours_balance decimal(10,3) DEFAULT 0 CHECK (hours_balance >= 0),
  daily_earned_hours decimal(10,3) DEFAULT 0 CHECK (daily_earned_hours >= 0),
  total_earned_hours decimal(10,3) DEFAULT 0,
  last_reset_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ad_free_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ad-free hours"
  ON ad_free_hours FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ad-free hours"
  ON ad_free_hours FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ad-free hours"
  ON ad_free_hours FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create ad_free_transactions table
CREATE TABLE IF NOT EXISTS ad_free_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'expire')),
  hours_amount decimal(10,3) NOT NULL,
  source text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_free_transactions_user_id ON ad_free_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_free_transactions_created_at ON ad_free_transactions(created_at DESC);

ALTER TABLE ad_free_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON ad_free_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON ad_free_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to get ad-free balance
CREATE OR REPLACE FUNCTION get_ad_free_balance(check_user_id uuid)
RETURNS decimal
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  balance decimal;
BEGIN
  -- Create record if doesn't exist
  INSERT INTO ad_free_hours (user_id)
  VALUES (check_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get balance
  SELECT hours_balance INTO balance
  FROM ad_free_hours
  WHERE user_id = check_user_id;

  RETURN COALESCE(balance, 0);
END;
$$;

-- Function to add ad-free hours
CREATE OR REPLACE FUNCTION add_ad_free_hours(
  p_user_id uuid,
  p_hours decimal,
  p_source text,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limit decimal := 2.0;
  v_current_daily decimal;
  v_can_add decimal;
  v_new_balance decimal;
BEGIN
  -- Ensure ad_free_hours record exists
  INSERT INTO ad_free_hours (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Reset daily counter if new day
  UPDATE ad_free_hours
  SET
    daily_earned_hours = 0,
    last_reset_date = CURRENT_DATE
  WHERE user_id = p_user_id
  AND last_reset_date < CURRENT_DATE;

  -- Get current daily earned
  SELECT daily_earned_hours INTO v_current_daily
  FROM ad_free_hours
  WHERE user_id = p_user_id;

  -- Calculate how much can be added (respect daily limit)
  v_can_add := LEAST(p_hours, v_daily_limit - v_current_daily);

  IF v_can_add <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Daily limit reached (2 hours)',
      'hours_added', 0,
      'daily_remaining', v_daily_limit - v_current_daily
    );
  END IF;

  -- Update balance
  UPDATE ad_free_hours
  SET
    hours_balance = hours_balance + v_can_add,
    daily_earned_hours = daily_earned_hours + v_can_add,
    total_earned_hours = total_earned_hours + v_can_add,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING hours_balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO ad_free_transactions (user_id, transaction_type, hours_amount, source, description)
  VALUES (p_user_id, 'earn', v_can_add, p_source, p_description);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ad-free hours added',
    'hours_added', v_can_add,
    'new_balance', v_new_balance,
    'daily_remaining', v_daily_limit - (v_current_daily + v_can_add)
  );
END;
$$;

-- Function to consume ad-free hours
CREATE OR REPLACE FUNCTION consume_ad_free_hours(
  p_user_id uuid,
  p_hours decimal
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance decimal;
  v_new_balance decimal;
BEGIN
  -- Get current balance
  SELECT hours_balance INTO v_current_balance
  FROM ad_free_hours
  WHERE user_id = p_user_id;

  IF v_current_balance IS NULL OR v_current_balance < p_hours THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient ad-free hours',
      'current_balance', COALESCE(v_current_balance, 0)
    );
  END IF;

  -- Deduct hours
  UPDATE ad_free_hours
  SET
    hours_balance = hours_balance - p_hours,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING hours_balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO ad_free_transactions (user_id, transaction_type, hours_amount, source, description)
  VALUES (p_user_id, 'spend', p_hours, 'usage', 'Ad-free browsing time consumed');

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ad-free hours consumed',
    'hours_consumed', p_hours,
    'new_balance', v_new_balance
  );
END;
$$;

-- Function to expire old ad-free hours (30 days)
CREATE OR REPLACE FUNCTION expire_old_ad_free_hours()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Find users with old transactions to expire
  WITH expired_hours AS (
    SELECT
      user_id,
      SUM(hours_amount) as total_expired
    FROM ad_free_transactions
    WHERE
      transaction_type = 'earn'
      AND created_at < (now() - INTERVAL '30 days')
      AND user_id IN (
        SELECT user_id FROM ad_free_hours WHERE hours_balance > 0
      )
    GROUP BY user_id
  )
  UPDATE ad_free_hours afh
  SET
    hours_balance = GREATEST(0, hours_balance - eh.total_expired),
    updated_at = now()
  FROM expired_hours eh
  WHERE afh.user_id = eh.user_id;

  -- Log expiration transactions
  INSERT INTO ad_free_transactions (user_id, transaction_type, hours_amount, source, description)
  SELECT
    user_id,
    'expire',
    SUM(hours_amount),
    'system',
    'Expired after 30 days'
  FROM ad_free_transactions
  WHERE
    transaction_type = 'earn'
    AND created_at < (now() - INTERVAL '30 days')
  GROUP BY user_id;
END;
$$;

-- Add index for profile ad-free status checks
CREATE INDEX IF NOT EXISTS idx_ad_free_hours_user_id ON ad_free_hours(user_id);
