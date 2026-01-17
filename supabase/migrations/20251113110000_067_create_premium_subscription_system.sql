/*
  # Create Premium Subscription System

  1. New Tables
    - `premium_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `stripe_subscription_id` (text, unique)
      - `stripe_customer_id` (text)
      - `plan_type` (text: 'monthly' | 'yearly')
      - `status` (text: 'active' | 'canceled' | 'past_due' | 'incomplete')
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `cancel_at_period_end` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `premium_plans`
      - `id` (uuid, primary key)
      - `plan_type` (text: 'monthly' | 'yearly')
      - `stripe_product_id` (text)
      - `stripe_price_id` (text)
      - `price_eur` (decimal)
      - `currency` (text, default 'EUR')
      - `active` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can read their own subscriptions
    - Only authenticated users can access
    - Admin can read all subscriptions

  3. Functions
    - `is_premium_user(user_id)` - Check if user has active premium
    - `get_user_subscription(user_id)` - Get user's current subscription
*/

-- Create premium_plans table
CREATE TABLE IF NOT EXISTS premium_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type text NOT NULL UNIQUE CHECK (plan_type IN ('monthly', 'yearly')),
  stripe_product_id text,
  stripe_price_id text,
  price_eur decimal(10,2) NOT NULL,
  currency text DEFAULT 'EUR',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE premium_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active premium plans"
  ON premium_plans FOR SELECT
  USING (active = true);

-- Create premium_subscriptions table
CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  plan_type text NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_subscription_per_user
  ON premium_subscriptions(user_id)
  WHERE status = 'active';

ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON premium_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON premium_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON premium_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add premium status to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_premium boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'premium_until'
  ) THEN
    ALTER TABLE profiles ADD COLUMN premium_until timestamptz;
  END IF;
END $$;

-- Function to check if user is premium
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
    AND status = 'active'
    AND current_period_end > now()
  ) INTO premium_status;

  RETURN COALESCE(premium_status, false);
END;
$$;

-- Function to get user subscription
CREATE OR REPLACE FUNCTION get_user_subscription(check_user_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_type text,
  status text,
  period_end timestamptz,
  cancel_at_period_end boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.plan_type,
    ps.status,
    ps.current_period_end,
    ps.cancel_at_period_end
  FROM premium_subscriptions ps
  WHERE ps.user_id = check_user_id
  AND ps.status = 'active'
  ORDER BY ps.created_at DESC
  LIMIT 1;
END;
$$;

-- Trigger to update profiles.is_premium when subscription changes
CREATE OR REPLACE FUNCTION update_profile_premium_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile premium status
  UPDATE profiles
  SET
    is_premium = (NEW.status = 'active' AND NEW.current_period_end > now()),
    premium_until = CASE
      WHEN NEW.status = 'active' THEN NEW.current_period_end
      ELSE NULL
    END
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_premium_status_trigger ON premium_subscriptions;
CREATE TRIGGER update_premium_status_trigger
  AFTER INSERT OR UPDATE ON premium_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_premium_status();

-- Insert default premium plans
INSERT INTO premium_plans (plan_type, price_eur, stripe_product_id, stripe_price_id) VALUES
  ('monthly', 4.99, 'PLACEHOLDER_MONTHLY_PRODUCT_ID', 'PLACEHOLDER_MONTHLY_PRICE_ID'),
  ('yearly', 39.99, 'PLACEHOLDER_YEARLY_PRODUCT_ID', 'PLACEHOLDER_YEARLY_PRICE_ID')
ON CONFLICT (plan_type) DO NOTHING;
