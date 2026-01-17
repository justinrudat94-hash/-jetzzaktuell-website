/*
  # Add Trial Tracking to Premium Subscriptions

  1. Changes to `premium_subscriptions` table
    - Add `has_used_trial` (boolean) - Tracks if user has ever used trial
    - Add `trial_start_date` (timestamptz) - When trial started
    - Add `trial_end_date` (timestamptz) - When trial ends/ended

  2. Purpose
    - Enable 7-day free trial for new users
    - Prevent multiple trial usage per user
    - Track trial period dates for UI display

  3. Migration Safety
    - Uses IF NOT EXISTS checks
    - Sets sensible defaults (has_used_trial = false)
    - Nullable trial dates for existing subscriptions

  4. Business Logic
    - New users: has_used_trial = false, eligible for trial
    - After trial used once: has_used_trial = true, no more trials
    - Trial dates set when subscription starts with status 'trialing'
*/

-- Add has_used_trial field to track trial usage per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'premium_subscriptions' AND column_name = 'has_used_trial'
  ) THEN
    ALTER TABLE premium_subscriptions
    ADD COLUMN has_used_trial boolean DEFAULT false NOT NULL;

    -- Add comment for documentation
    COMMENT ON COLUMN premium_subscriptions.has_used_trial IS
    'Tracks if user has ever used a trial period. Once true, user cannot start another trial.';
  END IF;
END $$;

-- Add trial_start_date to track when trial began
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'premium_subscriptions' AND column_name = 'trial_start_date'
  ) THEN
    ALTER TABLE premium_subscriptions
    ADD COLUMN trial_start_date timestamptz;

    COMMENT ON COLUMN premium_subscriptions.trial_start_date IS
    'Timestamp when the trial period started. Null if subscription never had a trial.';
  END IF;
END $$;

-- Add trial_end_date to track when trial ends
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'premium_subscriptions' AND column_name = 'trial_end_date'
  ) THEN
    ALTER TABLE premium_subscriptions
    ADD COLUMN trial_end_date timestamptz;

    COMMENT ON COLUMN premium_subscriptions.trial_end_date IS
    'Timestamp when the trial period ends/ended. Null if subscription never had a trial.';
  END IF;
END $$;

-- Create function to check if user has used trial
CREATE OR REPLACE FUNCTION user_has_used_trial(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trial_used boolean;
BEGIN
  SELECT COALESCE(bool_or(has_used_trial), false)
  INTO trial_used
  FROM premium_subscriptions
  WHERE user_id = check_user_id;

  RETURN trial_used;
END;
$$;

COMMENT ON FUNCTION user_has_used_trial IS
'Check if a user has ever used a trial period. Returns true if any subscription has has_used_trial=true.';

-- Create function to get trial info for current subscription
CREATE OR REPLACE FUNCTION get_trial_info(check_user_id uuid)
RETURNS TABLE (
  is_in_trial boolean,
  trial_ends_at timestamptz,
  days_remaining integer,
  has_used_trial boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (ps.status = 'trialing' AND ps.trial_end_date > now()) as is_in_trial,
    ps.trial_end_date as trial_ends_at,
    CASE
      WHEN ps.status = 'trialing' AND ps.trial_end_date > now()
      THEN EXTRACT(DAY FROM (ps.trial_end_date - now()))::integer
      ELSE 0
    END as days_remaining,
    ps.has_used_trial
  FROM premium_subscriptions ps
  WHERE ps.user_id = check_user_id
  AND ps.status IN ('trialing', 'active')
  ORDER BY ps.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_trial_info IS
'Get trial information for a user including trial status, end date, and remaining days.';

-- Update existing is_premium_user function to include trialing status
CREATE OR REPLACE FUNCTION is_premium_user(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  premium_status boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM premium_subscriptions
    WHERE user_id = check_user_id
    AND status IN ('active', 'trialing')
    AND (
      (status = 'active' AND current_period_end > now())
      OR (status = 'trialing' AND trial_end_date > now())
    )
  ) INTO premium_status;

  RETURN COALESCE(premium_status, false);
END;
$$;

COMMENT ON FUNCTION is_premium_user IS
'Check if user has active premium subscription or is in trial period.';

-- Create index for faster trial lookups
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_trial_status
  ON premium_subscriptions(user_id, has_used_trial)
  WHERE has_used_trial = true;

COMMENT ON INDEX idx_premium_subscriptions_trial_status IS
'Optimize queries checking if user has used trial before.';