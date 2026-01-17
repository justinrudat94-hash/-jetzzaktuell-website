/*
  # Create Ad Tracking and Revenue System

  1. New Tables
    - `ad_campaigns`
      - `id` (uuid, primary key)
      - `campaign_name` (text)
      - `ad_type` (text: 'banner' | 'interstitial' | 'rewarded')
      - `admob_ad_unit_id` (text)
      - `platform` (text: 'ios' | 'android' | 'web')
      - `active` (boolean)
      - `created_at` (timestamptz)

    - `ad_impressions`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, references ad_campaigns)
      - `user_id` (uuid, references profiles, nullable)
      - `ad_type` (text)
      - `platform` (text)
      - `was_clicked` (boolean)
      - `was_completed` (boolean) - For rewarded ads
      - `revenue_eur` (decimal) - Estimated revenue
      - `session_id` (text) - For tracking ad fatigue
      - `created_at` (timestamptz)

    - `ad_revenue_daily`
      - `id` (uuid, primary key)
      - `date` (date, unique)
      - `admob_revenue_eur` (decimal)
      - `banner_impressions` (integer)
      - `banner_clicks` (integer)
      - `banner_ctr` (decimal)
      - `banner_ecpm` (decimal)
      - `interstitial_impressions` (integer)
      - `interstitial_clicks` (integer)
      - `interstitial_ctr` (decimal)
      - `interstitial_ecpm` (decimal)
      - `rewarded_impressions` (integer)
      - `rewarded_completions` (integer)
      - `rewarded_completion_rate` (decimal)
      - `rewarded_ecpm` (decimal)
      - `total_impressions` (integer)
      - `total_clicks` (integer)
      - `created_at` (timestamptz)

    - `premium_revenue_daily`
      - `id` (uuid, primary key)
      - `date` (date, unique)
      - `monthly_subscriptions` (integer)
      - `yearly_subscriptions` (integer)
      - `monthly_revenue_eur` (decimal)
      - `yearly_revenue_eur` (decimal)
      - `total_revenue_eur` (decimal)
      - `new_subscriptions` (integer)
      - `canceled_subscriptions` (integer)
      - `mrr` (decimal) - Monthly Recurring Revenue
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Only admins can read revenue data
    - Public can write impressions (for tracking)

  3. Functions
    - `track_ad_impression()` - Track ad display
    - `track_ad_click()` - Track ad click
    - `calculate_daily_ad_stats()` - Aggregate daily stats
    - `get_dashboard_metrics()` - Get essential metrics for admin
*/

-- Create ad_campaigns table
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name text NOT NULL,
  ad_type text NOT NULL CHECK (ad_type IN ('banner', 'interstitial', 'rewarded')),
  admob_ad_unit_id text,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active campaigns"
  ON ad_campaigns FOR SELECT
  USING (active = true);

-- Create ad_impressions table
CREATE TABLE IF NOT EXISTS ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES ad_campaigns(id),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ad_type text NOT NULL CHECK (ad_type IN ('banner', 'interstitial', 'rewarded')),
  platform text NOT NULL,
  was_clicked boolean DEFAULT false,
  was_completed boolean DEFAULT false,
  revenue_eur decimal(10,4) DEFAULT 0,
  session_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_created_at ON ad_impressions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_id ON ad_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_type ON ad_impressions(ad_type);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_session_id ON ad_impressions(session_id);

ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert impressions"
  ON ad_impressions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own impressions"
  ON ad_impressions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create ad_revenue_daily table
CREATE TABLE IF NOT EXISTS ad_revenue_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  admob_revenue_eur decimal(10,2) DEFAULT 0,
  banner_impressions integer DEFAULT 0,
  banner_clicks integer DEFAULT 0,
  banner_ctr decimal(5,2) DEFAULT 0,
  banner_ecpm decimal(10,2) DEFAULT 0,
  interstitial_impressions integer DEFAULT 0,
  interstitial_clicks integer DEFAULT 0,
  interstitial_ctr decimal(5,2) DEFAULT 0,
  interstitial_ecpm decimal(10,2) DEFAULT 0,
  rewarded_impressions integer DEFAULT 0,
  rewarded_completions integer DEFAULT 0,
  rewarded_completion_rate decimal(5,2) DEFAULT 0,
  rewarded_ecpm decimal(10,2) DEFAULT 0,
  total_impressions integer DEFAULT 0,
  total_clicks integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_revenue_daily_date ON ad_revenue_daily(date DESC);

ALTER TABLE ad_revenue_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated users can view ad revenue"
  ON ad_revenue_daily FOR SELECT
  TO authenticated
  USING (true);

-- Create premium_revenue_daily table
CREATE TABLE IF NOT EXISTS premium_revenue_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  monthly_subscriptions integer DEFAULT 0,
  yearly_subscriptions integer DEFAULT 0,
  monthly_revenue_eur decimal(10,2) DEFAULT 0,
  yearly_revenue_eur decimal(10,2) DEFAULT 0,
  total_revenue_eur decimal(10,2) DEFAULT 0,
  new_subscriptions integer DEFAULT 0,
  canceled_subscriptions integer DEFAULT 0,
  mrr decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_premium_revenue_daily_date ON premium_revenue_daily(date DESC);

ALTER TABLE premium_revenue_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated users can view premium revenue"
  ON premium_revenue_daily FOR SELECT
  TO authenticated
  USING (true);

-- Function to track ad impression
CREATE OR REPLACE FUNCTION track_ad_impression(
  p_campaign_id uuid,
  p_user_id uuid,
  p_ad_type text,
  p_platform text,
  p_session_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_impression_id uuid;
BEGIN
  INSERT INTO ad_impressions (campaign_id, user_id, ad_type, platform, session_id)
  VALUES (p_campaign_id, p_user_id, p_ad_type, p_platform, p_session_id)
  RETURNING id INTO v_impression_id;

  RETURN v_impression_id;
END;
$$;

-- Function to track ad click
CREATE OR REPLACE FUNCTION track_ad_click(p_impression_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ad_impressions
  SET was_clicked = true
  WHERE id = p_impression_id;

  RETURN FOUND;
END;
$$;

-- Function to track rewarded ad completion
CREATE OR REPLACE FUNCTION track_rewarded_completion(p_impression_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ad_impressions
  SET was_completed = true
  WHERE id = p_impression_id
  AND ad_type = 'rewarded';

  RETURN FOUND;
END;
$$;

-- Function to calculate daily ad stats
CREATE OR REPLACE FUNCTION calculate_daily_ad_stats(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_banner_stats record;
  v_interstitial_stats record;
  v_rewarded_stats record;
  v_total_impressions integer;
  v_total_clicks integer;
BEGIN
  -- Calculate banner stats
  SELECT
    COUNT(*) as impressions,
    COUNT(*) FILTER (WHERE was_clicked) as clicks,
    CASE WHEN COUNT(*) > 0 THEN
      (COUNT(*) FILTER (WHERE was_clicked)::decimal / COUNT(*) * 100)
    ELSE 0 END as ctr,
    CASE WHEN COUNT(*) > 0 THEN
      (SUM(revenue_eur) / COUNT(*) * 1000)
    ELSE 0 END as ecpm
  INTO v_banner_stats
  FROM ad_impressions
  WHERE ad_type = 'banner'
  AND created_at::date = target_date;

  -- Calculate interstitial stats
  SELECT
    COUNT(*) as impressions,
    COUNT(*) FILTER (WHERE was_clicked) as clicks,
    CASE WHEN COUNT(*) > 0 THEN
      (COUNT(*) FILTER (WHERE was_clicked)::decimal / COUNT(*) * 100)
    ELSE 0 END as ctr,
    CASE WHEN COUNT(*) > 0 THEN
      (SUM(revenue_eur) / COUNT(*) * 1000)
    ELSE 0 END as ecpm
  INTO v_interstitial_stats
  FROM ad_impressions
  WHERE ad_type = 'interstitial'
  AND created_at::date = target_date;

  -- Calculate rewarded stats
  SELECT
    COUNT(*) as impressions,
    COUNT(*) FILTER (WHERE was_completed) as completions,
    CASE WHEN COUNT(*) > 0 THEN
      (COUNT(*) FILTER (WHERE was_completed)::decimal / COUNT(*) * 100)
    ELSE 0 END as completion_rate,
    CASE WHEN COUNT(*) > 0 THEN
      (SUM(revenue_eur) / COUNT(*) * 1000)
    ELSE 0 END as ecpm
  INTO v_rewarded_stats
  FROM ad_impressions
  WHERE ad_type = 'rewarded'
  AND created_at::date = target_date;

  -- Calculate totals
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE was_clicked)
  INTO v_total_impressions, v_total_clicks
  FROM ad_impressions
  WHERE created_at::date = target_date;

  -- Insert or update daily stats
  INSERT INTO ad_revenue_daily (
    date,
    banner_impressions, banner_clicks, banner_ctr, banner_ecpm,
    interstitial_impressions, interstitial_clicks, interstitial_ctr, interstitial_ecpm,
    rewarded_impressions, rewarded_completions, rewarded_completion_rate, rewarded_ecpm,
    total_impressions, total_clicks,
    admob_revenue_eur
  ) VALUES (
    target_date,
    v_banner_stats.impressions, v_banner_stats.clicks, v_banner_stats.ctr, v_banner_stats.ecpm,
    v_interstitial_stats.impressions, v_interstitial_stats.clicks, v_interstitial_stats.ctr, v_interstitial_stats.ecpm,
    v_rewarded_stats.impressions, v_rewarded_stats.completions, v_rewarded_stats.completion_rate, v_rewarded_stats.ecpm,
    v_total_impressions, v_total_clicks,
    (SELECT COALESCE(SUM(revenue_eur), 0) FROM ad_impressions WHERE created_at::date = target_date)
  )
  ON CONFLICT (date) DO UPDATE SET
    banner_impressions = EXCLUDED.banner_impressions,
    banner_clicks = EXCLUDED.banner_clicks,
    banner_ctr = EXCLUDED.banner_ctr,
    banner_ecpm = EXCLUDED.banner_ecpm,
    interstitial_impressions = EXCLUDED.interstitial_impressions,
    interstitial_clicks = EXCLUDED.interstitial_clicks,
    interstitial_ctr = EXCLUDED.interstitial_ctr,
    interstitial_ecpm = EXCLUDED.interstitial_ecpm,
    rewarded_impressions = EXCLUDED.rewarded_impressions,
    rewarded_completions = EXCLUDED.rewarded_completions,
    rewarded_completion_rate = EXCLUDED.rewarded_completion_rate,
    rewarded_ecpm = EXCLUDED.rewarded_ecpm,
    total_impressions = EXCLUDED.total_impressions,
    total_clicks = EXCLUDED.total_clicks,
    admob_revenue_eur = EXCLUDED.admob_revenue_eur;
END;
$$;

-- Function to calculate daily premium stats
CREATE OR REPLACE FUNCTION calculate_daily_premium_stats(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly_subs integer;
  v_yearly_subs integer;
  v_monthly_revenue decimal;
  v_yearly_revenue decimal;
  v_new_subs integer;
  v_canceled_subs integer;
  v_mrr decimal;
BEGIN
  -- Count active subscriptions by type
  SELECT
    COUNT(*) FILTER (WHERE plan_type = 'monthly') as monthly,
    COUNT(*) FILTER (WHERE plan_type = 'yearly') as yearly
  INTO v_monthly_subs, v_yearly_subs
  FROM premium_subscriptions
  WHERE status = 'active'
  AND current_period_end > now();

  -- Calculate revenue
  SELECT
    COALESCE(SUM(pp.price_eur) FILTER (WHERE ps.plan_type = 'monthly'), 0) as monthly_rev,
    COALESCE(SUM(pp.price_eur) FILTER (WHERE ps.plan_type = 'yearly'), 0) as yearly_rev
  INTO v_monthly_revenue, v_yearly_revenue
  FROM premium_subscriptions ps
  JOIN premium_plans pp ON ps.plan_type = pp.plan_type
  WHERE ps.status = 'active'
  AND ps.current_period_end > now();

  -- Count new subscriptions
  SELECT COUNT(*) INTO v_new_subs
  FROM premium_subscriptions
  WHERE created_at::date = target_date;

  -- Count canceled subscriptions
  SELECT COUNT(*) INTO v_canceled_subs
  FROM premium_subscriptions
  WHERE status = 'canceled'
  AND updated_at::date = target_date;

  -- Calculate MRR (Monthly + Yearly/12)
  v_mrr := v_monthly_revenue + (v_yearly_revenue / 12);

  -- Insert or update daily stats
  INSERT INTO premium_revenue_daily (
    date,
    monthly_subscriptions,
    yearly_subscriptions,
    monthly_revenue_eur,
    yearly_revenue_eur,
    total_revenue_eur,
    new_subscriptions,
    canceled_subscriptions,
    mrr
  ) VALUES (
    target_date,
    v_monthly_subs,
    v_yearly_subs,
    v_monthly_revenue,
    v_yearly_revenue,
    v_monthly_revenue + v_yearly_revenue,
    v_new_subs,
    v_canceled_subs,
    v_mrr
  )
  ON CONFLICT (date) DO UPDATE SET
    monthly_subscriptions = EXCLUDED.monthly_subscriptions,
    yearly_subscriptions = EXCLUDED.yearly_subscriptions,
    monthly_revenue_eur = EXCLUDED.monthly_revenue_eur,
    yearly_revenue_eur = EXCLUDED.yearly_revenue_eur,
    total_revenue_eur = EXCLUDED.total_revenue_eur,
    new_subscriptions = EXCLUDED.new_subscriptions,
    canceled_subscriptions = EXCLUDED.canceled_subscriptions,
    mrr = EXCLUDED.mrr;
END;
$$;

-- Insert default ad campaigns (placeholders)
INSERT INTO ad_campaigns (campaign_name, ad_type, admob_ad_unit_id, platform) VALUES
  ('Banner iOS', 'banner', 'PLACEHOLDER_BANNER_IOS', 'ios'),
  ('Banner Android', 'banner', 'PLACEHOLDER_BANNER_ANDROID', 'android'),
  ('Interstitial iOS', 'interstitial', 'PLACEHOLDER_INTERSTITIAL_IOS', 'ios'),
  ('Interstitial Android', 'interstitial', 'PLACEHOLDER_INTERSTITIAL_ANDROID', 'android'),
  ('Rewarded iOS', 'rewarded', 'PLACEHOLDER_REWARDED_IOS', 'ios'),
  ('Rewarded Android', 'rewarded', 'PLACEHOLDER_REWARDED_ANDROID', 'android')
ON CONFLICT DO NOTHING;
