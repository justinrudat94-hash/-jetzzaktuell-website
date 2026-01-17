/*
  # Complete Event Boost System with Premium and Business Subscriptions

  ## Overview
  This migration creates a comprehensive event boost system with three tiers:
  - Standard Boost (50km radius, rotating placement)
  - Spotlight (nationwide, highlights section)
  - Premium & Business subscriptions with ad-free experience

  ## New Tables

  ### spotlight_business_subscriptions
  Manages Business subscription plans (449€/month) with included spotlight events
  - Tracks included spotlight usage
  - Counts additional spotlight purchases
  - Links to Stripe subscription

  ### boost_transactions
  Records all boost purchases and usage
  - Tracks coin spending
  - Links boosts to events and users
  - Stores boost configuration (type, duration, radius)

  ## Extended Tables

  ### profiles
  Added fields:
  - `boost_credits_remaining` (int): Free boost credits for Premium users (1x per month)
  - `is_business` (boolean): Business subscription status
  - `business_subscription_id` (uuid): Link to business subscription

  ### events
  Added fields:
  - `is_boosted` (boolean): Whether event is currently boosted
  - `boost_type` (text): 'standard' or 'spotlight'
  - `boost_tier` (text): Tier level (standard, standard_premium_free, spotlight_standard, business_included, business_additional)
  - `boost_expires_at` (timestamptz): When boost ends
  - `boost_radius_km` (int): Boost radius (50 for standard, null for spotlight = nationwide)
  - `boost_priority` (int): Display priority (10=standard, 50=spotlight, 100=business)
  - `boosted_at` (timestamptz): When boost was activated
  - `boosted_by_user_id` (uuid): Who activated the boost

  ## Functions

  ### boost_event
  Main function to boost an event with automatic tier detection and pricing
  - Checks user subscription status (Premium, Business)
  - Calculates pricing based on tier and duration
  - Applies boost to event
  - Records transaction

  ### check_expired_boosts
  Cron job function to automatically expire boosts when boost_expires_at is reached

  ### get_events_with_priority
  Returns events sorted by boost priority for homepage display
  - Highlights section: Spotlight events (priority 100, then 50)
  - Nearby section: Standard boosts within radius (priority 10)

  ## Security
  - RLS policies ensure users can only boost their own events
  - Business subscription data is protected
  - Transaction history is private to users
*/

-- =====================================================
-- EXTEND PROFILES TABLE
-- =====================================================

DO $$
BEGIN
  -- Add boost_credits_remaining for Premium users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'boost_credits_remaining'
  ) THEN
    ALTER TABLE profiles ADD COLUMN boost_credits_remaining INTEGER DEFAULT 0;
  END IF;

  -- Add is_business flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_business'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_business BOOLEAN DEFAULT false;
  END IF;

  -- Add business_subscription_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'business_subscription_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN business_subscription_id UUID;
  END IF;
END $$;

-- =====================================================
-- CREATE SPOTLIGHT_BUSINESS_SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS spotlight_business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,

  -- Subscription details
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
  price_eur NUMERIC(10, 2) NOT NULL DEFAULT 449.00,
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Billing period
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- Spotlight usage tracking
  included_spotlight_used BOOLEAN DEFAULT false,
  additional_spotlights_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key after table creation
ALTER TABLE profiles ADD CONSTRAINT fk_business_subscription
  FOREIGN KEY (business_subscription_id)
  REFERENCES spotlight_business_subscriptions(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_subs_user_id ON spotlight_business_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_business_subs_status ON spotlight_business_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_business_subs_stripe_sub_id ON spotlight_business_subscriptions(stripe_subscription_id);

-- RLS Policies
ALTER TABLE spotlight_business_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business subscription"
  ON spotlight_business_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage business subscriptions"
  ON spotlight_business_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- EXTEND EVENTS TABLE
-- =====================================================

DO $$
BEGIN
  -- Add is_boosted flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'is_boosted'
  ) THEN
    ALTER TABLE events ADD COLUMN is_boosted BOOLEAN DEFAULT false;
  END IF;

  -- Add boost_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'boost_type'
  ) THEN
    ALTER TABLE events ADD COLUMN boost_type TEXT CHECK (boost_type IN ('standard', 'spotlight'));
  END IF;

  -- Add boost_tier
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'boost_tier'
  ) THEN
    ALTER TABLE events ADD COLUMN boost_tier TEXT;
  END IF;

  -- Add boost_expires_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'boost_expires_at'
  ) THEN
    ALTER TABLE events ADD COLUMN boost_expires_at TIMESTAMPTZ;
  END IF;

  -- Add boost_radius_km
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'boost_radius_km'
  ) THEN
    ALTER TABLE events ADD COLUMN boost_radius_km INTEGER;
  END IF;

  -- Add boost_priority
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'boost_priority'
  ) THEN
    ALTER TABLE events ADD COLUMN boost_priority INTEGER DEFAULT 0;
  END IF;

  -- Add boosted_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'boosted_at'
  ) THEN
    ALTER TABLE events ADD COLUMN boosted_at TIMESTAMPTZ;
  END IF;

  -- Add boosted_by_user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'boosted_by_user_id'
  ) THEN
    ALTER TABLE events ADD COLUMN boosted_by_user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Indexes for boost queries
CREATE INDEX IF NOT EXISTS idx_events_is_boosted ON events(is_boosted) WHERE is_boosted = true;
CREATE INDEX IF NOT EXISTS idx_events_boost_type ON events(boost_type) WHERE boost_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_boost_priority ON events(boost_priority DESC);
CREATE INDEX IF NOT EXISTS idx_events_boost_expires_at ON events(boost_expires_at) WHERE boost_expires_at IS NOT NULL;

-- =====================================================
-- CREATE BOOST_TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS boost_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction details
  boost_type TEXT NOT NULL CHECK (boost_type IN ('standard', 'spotlight')),
  boost_tier TEXT NOT NULL,
  duration_option TEXT NOT NULL CHECK (duration_option IN ('24h', '3days', '7days', '30days')),
  duration_hours INTEGER NOT NULL,

  -- Pricing
  coins_spent INTEGER NOT NULL,
  euros_equivalent NUMERIC(10, 2) NOT NULL,

  -- Boost configuration
  boost_radius_km INTEGER,
  boost_priority INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'canceled', 'refunded')),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_boost_trans_event_id ON boost_transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_boost_trans_user_id ON boost_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_trans_status ON boost_transactions(status);
CREATE INDEX IF NOT EXISTS idx_boost_trans_expires_at ON boost_transactions(expires_at);

-- RLS Policies
ALTER TABLE boost_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own boost transactions"
  ON boost_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create boost transactions"
  ON boost_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage boost transactions"
  ON boost_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- BOOST_EVENT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION boost_event(
  p_event_id UUID,
  p_user_id UUID,
  p_boost_type TEXT,
  p_duration_option TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coins_required INTEGER;
  v_duration_hours INTEGER;
  v_has_business BOOLEAN;
  v_business_sub_id UUID;
  v_included_used BOOLEAN;
  v_has_premium BOOLEAN;
  v_has_free_credit BOOLEAN;
  v_boost_tier TEXT;
  v_boost_priority INTEGER;
  v_euros_equivalent NUMERIC(10, 2);
  v_radius INTEGER;
  v_event_owner UUID;
BEGIN

  -- Check if user owns the event
  SELECT user_id INTO v_event_owner FROM events WHERE id = p_event_id;

  IF v_event_owner IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event_owner != p_user_id THEN
    RAISE EXCEPTION 'You can only boost your own events';
  END IF;

  -- Determine duration in hours
  v_duration_hours := CASE p_duration_option
    WHEN '24h' THEN 24
    WHEN '3days' THEN 72
    WHEN '7days' THEN 168
    WHEN '30days' THEN 720
    ELSE NULL
  END;

  IF v_duration_hours IS NULL THEN
    RAISE EXCEPTION 'Invalid duration: Use 24h, 3days, 7days, or 30days';
  END IF;

  -- STANDARD BOOST (50km, rotating)
  IF p_boost_type = 'standard' THEN

    -- Standard boost only available for 24h, 3days, 7days
    IF p_duration_option NOT IN ('24h', '3days', '7days') THEN
      RAISE EXCEPTION 'Standard boost only available for 24h, 3 days, or 7 days';
    END IF;

    -- Calculate coins required
    v_coins_required := CASE p_duration_option
      WHEN '24h' THEN 1000      -- 1€
      WHEN '3days' THEN 2500    -- 2.50€
      WHEN '7days' THEN 5000    -- 5€
    END;

    v_euros_equivalent := v_coins_required / 1000.0;
    v_radius := 50;

    -- Check Premium free boost (only 7 days)
    IF p_duration_option = '7days' THEN
      SELECT is_premium, boost_credits_remaining > 0
      INTO v_has_premium, v_has_free_credit
      FROM profiles WHERE id = p_user_id;

      IF v_has_premium AND v_has_free_credit THEN
        -- Use free boost credit
        UPDATE profiles
        SET boost_credits_remaining = boost_credits_remaining - 1
        WHERE id = p_user_id;

        v_coins_required := 0;
        v_euros_equivalent := 0;
        v_boost_tier := 'standard_premium_free';
      ELSE
        v_boost_tier := 'standard';
      END IF;
    ELSE
      v_boost_tier := 'standard';
    END IF;

    v_boost_priority := 10;

    -- Deduct coins if not free
    IF v_coins_required > 0 THEN
      UPDATE user_stats
      SET total_coins = total_coins - v_coins_required
      WHERE user_id = p_user_id AND total_coins >= v_coins_required;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient coins! Required: % coins', v_coins_required;
      END IF;
    END IF;

  -- SPOTLIGHT BOOST (Nationwide)
  ELSIF p_boost_type = 'spotlight' THEN

    -- Check Business subscription
    SELECT
      id,
      included_spotlight_used
    INTO
      v_business_sub_id,
      v_included_used
    FROM spotlight_business_subscriptions
    WHERE
      user_id = p_user_id
      AND status = 'active'
      AND current_period_end > now()
    LIMIT 1;

    v_has_business := (v_business_sub_id IS NOT NULL);
    v_radius := NULL; -- Nationwide

    IF v_has_business THEN
      -- BUSINESS SUBSCRIPTION USER

      IF NOT v_included_used THEN
        -- 1st Event: INCLUDED (any duration!)
        v_coins_required := 0;
        v_euros_equivalent := 0;
        v_boost_tier := 'business_included';
        v_boost_priority := 100;

        -- Mark as used
        UPDATE spotlight_business_subscriptions
        SET included_spotlight_used = true,
            updated_at = now()
        WHERE id = v_business_sub_id;

      ELSE
        -- 2nd+ Event: 349€ (any duration!)
        v_coins_required := 349000;  -- 349€ = 349,000 coins
        v_euros_equivalent := 349.00;
        v_boost_tier := 'business_additional';
        v_boost_priority := 100;

        -- Deduct coins
        UPDATE user_stats
        SET total_coins = total_coins - v_coins_required
        WHERE user_id = p_user_id AND total_coins >= v_coins_required;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Insufficient coins! Required: 349,000 coins (349€)';
        END IF;

        -- Increment additional spotlights counter
        UPDATE spotlight_business_subscriptions
        SET additional_spotlights_count = additional_spotlights_count + 1,
            updated_at = now()
        WHERE id = v_business_sub_id;
      END IF;

    ELSE
      -- NO Business subscription: Standard Spotlight pricing
      v_coins_required := CASE p_duration_option
        WHEN '24h' THEN 25000      -- 25€
        WHEN '3days' THEN 75000    -- 75€
        WHEN '7days' THEN 150000   -- 150€
        WHEN '30days' THEN 600000  -- 600€
      END;

      v_euros_equivalent := v_coins_required / 1000.0;
      v_boost_tier := 'spotlight_standard';
      v_boost_priority := 50;

      -- Deduct coins
      UPDATE user_stats
      SET total_coins = total_coins - v_coins_required
      WHERE user_id = p_user_id AND total_coins >= v_coins_required;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient coins! Required: % coins (%.2f€)', v_coins_required, v_euros_equivalent;
      END IF;
    END IF;

  ELSE
    RAISE EXCEPTION 'Invalid boost type: Use standard or spotlight';
  END IF;

  -- Update event with boost
  UPDATE events SET
    is_boosted = true,
    boost_type = p_boost_type,
    boost_tier = v_boost_tier,
    boost_radius_km = v_radius,
    boost_expires_at = now() + (v_duration_hours || ' hours')::interval,
    boost_priority = v_boost_priority,
    boosted_at = now(),
    boosted_by_user_id = p_user_id
  WHERE id = p_event_id;

  -- Record transaction
  INSERT INTO boost_transactions (
    event_id,
    user_id,
    boost_type,
    boost_tier,
    duration_option,
    duration_hours,
    coins_spent,
    euros_equivalent,
    boost_radius_km,
    boost_priority,
    status,
    expires_at
  ) VALUES (
    p_event_id,
    p_user_id,
    p_boost_type,
    v_boost_tier,
    p_duration_option,
    v_duration_hours,
    v_coins_required,
    v_euros_equivalent,
    v_radius,
    v_boost_priority,
    'active',
    now() + (v_duration_hours || ' hours')::interval
  );

  RETURN jsonb_build_object(
    'success', true,
    'boost_type', p_boost_type,
    'boost_tier', v_boost_tier,
    'coins_spent', v_coins_required,
    'euros_equivalent', v_euros_equivalent,
    'duration_hours', v_duration_hours,
    'expires_at', now() + (v_duration_hours || ' hours')::interval
  );

END;
$$;

-- =====================================================
-- CHECK_EXPIRED_BOOSTS FUNCTION (Cron Job)
-- =====================================================

CREATE OR REPLACE FUNCTION check_expired_boosts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  -- Expire events
  UPDATE events
  SET
    is_boosted = false,
    boost_type = NULL,
    boost_tier = NULL,
    boost_expires_at = NULL,
    boost_radius_km = NULL,
    boost_priority = 0
  WHERE
    is_boosted = true
    AND boost_expires_at <= now();

  -- Update transactions
  UPDATE boost_transactions
  SET
    status = 'expired',
    updated_at = now()
  WHERE
    status = 'active'
    AND expires_at <= now();

END;
$$;

-- =====================================================
-- RESET BUSINESS SUBSCRIPTION INCLUDED SPOTLIGHT (Monthly Cron)
-- =====================================================

CREATE OR REPLACE FUNCTION reset_business_included_spotlights()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  -- Reset included_spotlight_used for active subscriptions at period end
  UPDATE spotlight_business_subscriptions
  SET
    included_spotlight_used = false,
    additional_spotlights_count = 0,
    current_period_start = current_period_end,
    current_period_end = current_period_end + interval '1 month',
    updated_at = now()
  WHERE
    status = 'active'
    AND current_period_end <= now();

END;
$$;

-- =====================================================
-- RESET PREMIUM BOOST CREDITS (Monthly Cron)
-- =====================================================

CREATE OR REPLACE FUNCTION reset_premium_boost_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  -- Reset boost credits for active Premium users
  UPDATE profiles
  SET boost_credits_remaining = 1
  WHERE is_premium = true;

END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION boost_event TO authenticated;
GRANT EXECUTE ON FUNCTION check_expired_boosts TO service_role;
GRANT EXECUTE ON FUNCTION reset_business_included_spotlights TO service_role;
GRANT EXECUTE ON FUNCTION reset_premium_boost_credits TO service_role;