/*
  # JETZZ Monetization & Advertising System

  ## Overview

  This migration creates a complete monetization system including:
  - Event ticket sales with QR codes
  - Advertising system (Banner, Interstitial, Rewarded, Stream)
  - Partnership and local advertising
  - Revenue tracking and analytics

  ## New Tables

  1. **event_tickets**
     - Ticket types and pricing for events
     - Inventory management
     - Sales tracking

  2. **ticket_purchases**
     - User ticket purchases
     - Payment status tracking
     - QR code generation for entry

  3. **advertising_partners**
     - Partner companies (clubs, brands, venues)
     - Partner tier system
     - Contact and branding info

  4. **partner_campaigns**
     - Advertising campaigns
     - Budget and targeting
     - Performance tracking

  5. **ad_impressions**
     - Ad view and click tracking
     - Performance analytics
     - User interaction data

  6. **user_ad_state**
     - User ad frequency control
     - Daily limits for rewarded ads
     - Last impression tracking

  7. **stream_sessions**
     - Livestream analytics
     - Ad break tracking
     - Revenue per stream

  8. **revenue_analytics**
     - Daily revenue tracking
     - Source breakdown
     - Platform vs Creator shares

  ## Security

  - RLS enabled on all tables
  - Users can only view own purchases and tickets
  - Partners can only manage own campaigns
  - Admin-only access to revenue analytics

  ## Features

  - Automatic ticket inventory management
  - QR code generation for tickets
  - Ad frequency capping
  - Revenue split calculation (90% creator / 10% platform)
  - Partner tier benefits
*/

-- ============================================================================
-- 1. EVENT TICKETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL DEFAULT 0,
  quantity_total integer NOT NULL DEFAULT 0,
  quantity_sold integer DEFAULT 0,
  sale_start timestamptz DEFAULT now(),
  sale_end timestamptz,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (quantity_sold <= quantity_total),
  CHECK (price >= 0)
);

ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tickets"
  ON event_tickets FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Event creators can manage tickets"
  ON event_tickets FOR ALL
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE creator_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS event_tickets_event_id_idx ON event_tickets(event_id);
CREATE INDEX IF NOT EXISTS event_tickets_active_idx ON event_tickets(active);

-- ============================================================================
-- 2. TICKET PURCHASES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES event_tickets(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  payment_method text DEFAULT 'stripe',
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_intent_id text,
  qr_code_data text,
  used boolean DEFAULT false,
  used_at timestamptz,
  purchased_at timestamptz DEFAULT now(),
  CHECK (quantity > 0),
  CHECK (total_price >= 0)
);

ALTER TABLE ticket_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON ticket_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Event creators can view their event tickets"
  ON ticket_purchases FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE creator_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS ticket_purchases_buyer_id_idx ON ticket_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS ticket_purchases_event_id_idx ON ticket_purchases(event_id);
CREATE INDEX IF NOT EXISTS ticket_purchases_status_idx ON ticket_purchases(payment_status);

-- ============================================================================
-- 3. ADVERTISING PARTNERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS advertising_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  logo_url text,
  website_url text,
  contact_email text NOT NULL,
  contact_phone text,
  tier text DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  active boolean DEFAULT true,
  total_spent decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE advertising_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active partners"
  ON advertising_partners FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Partners can manage own profile"
  ON advertising_partners FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS advertising_partners_active_idx ON advertising_partners(active);
CREATE INDEX IF NOT EXISTS advertising_partners_tier_idx ON advertising_partners(tier);

-- ============================================================================
-- 4. PARTNER CAMPAIGNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES advertising_partners(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  ad_type text NOT NULL CHECK (ad_type IN ('banner', 'interstitial', 'rewarded', 'stream_overlay', 'sponsored_event')),
  ad_content jsonb DEFAULT '{}',
  target_category text[],
  target_city text[],
  budget decimal(10,2) NOT NULL DEFAULT 0,
  spent decimal(10,2) DEFAULT 0,
  cost_per_impression decimal(10,4) DEFAULT 0.01,
  cost_per_click decimal(10,4) DEFAULT 0.10,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (spent <= budget),
  CHECK (end_date >= start_date)
);

ALTER TABLE partner_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active campaigns"
  ON partner_campaigns FOR SELECT
  TO authenticated
  USING (active = true AND CURRENT_DATE BETWEEN start_date AND end_date);

CREATE POLICY "Partners can manage own campaigns"
  ON partner_campaigns FOR ALL
  TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM advertising_partners WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS partner_campaigns_partner_id_idx ON partner_campaigns(partner_id);
CREATE INDEX IF NOT EXISTS partner_campaigns_active_idx ON partner_campaigns(active);
CREATE INDEX IF NOT EXISTS partner_campaigns_dates_idx ON partner_campaigns(start_date, end_date);

-- ============================================================================
-- 5. AD IMPRESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES partner_campaigns(id) ON DELETE SET NULL,
  ad_type text NOT NULL,
  ad_placement text NOT NULL,
  clicked boolean DEFAULT false,
  click_url text,
  revenue_generated decimal(10,4) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own impressions"
  ON ad_impressions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ad_impressions_user_id_idx ON ad_impressions(user_id);
CREATE INDEX IF NOT EXISTS ad_impressions_campaign_id_idx ON ad_impressions(campaign_id);
CREATE INDEX IF NOT EXISTS ad_impressions_created_at_idx ON ad_impressions(created_at DESC);

-- ============================================================================
-- 6. USER AD STATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_ad_state (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  last_interstitial_at timestamptz,
  interstitial_count integer DEFAULT 0,
  clicks_since_last_ad integer DEFAULT 0,
  rewarded_ads_today integer DEFAULT 0,
  last_rewarded_ad_date date,
  total_ad_revenue decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_ad_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ad state"
  ON user_ad_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own ad state"
  ON user_ad_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. STREAM SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stream_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  title text NOT NULL,
  duration_seconds integer DEFAULT 0,
  peak_viewers integer DEFAULT 0,
  total_viewers integer DEFAULT 0,
  ad_breaks_shown integer DEFAULT 0,
  revenue_generated decimal(10,2) DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stream_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streams"
  ON stream_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = host_id);

CREATE POLICY "Users can manage own streams"
  ON stream_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = host_id);

CREATE INDEX IF NOT EXISTS stream_sessions_host_id_idx ON stream_sessions(host_id);
CREATE INDEX IF NOT EXISTS stream_sessions_event_id_idx ON stream_sessions(event_id);
CREATE INDEX IF NOT EXISTS stream_sessions_started_at_idx ON stream_sessions(started_at DESC);

-- ============================================================================
-- 8. REVENUE ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS revenue_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  revenue_source text NOT NULL,
  total_revenue decimal(10,2) DEFAULT 0,
  platform_share decimal(10,2) DEFAULT 0,
  creator_share decimal(10,2) DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, revenue_source)
);

ALTER TABLE revenue_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view revenue analytics"
  ON revenue_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS revenue_analytics_date_idx ON revenue_analytics(date DESC);
CREATE INDEX IF NOT EXISTS revenue_analytics_source_idx ON revenue_analytics(revenue_source);

-- ============================================================================
-- 9. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Initialize user ad state on profile creation
CREATE OR REPLACE FUNCTION initialize_user_ad_state()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_ad_state (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_ad_state ON profiles;
CREATE TRIGGER on_profile_created_ad_state
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_ad_state();

-- Function: Update ticket inventory on purchase
CREATE OR REPLACE FUNCTION update_ticket_inventory()
RETURNS trigger AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
    UPDATE event_tickets
    SET
      quantity_sold = quantity_sold + NEW.quantity,
      updated_at = now()
    WHERE id = NEW.ticket_id;
  END IF;

  IF NEW.payment_status = 'refunded' AND OLD.payment_status = 'completed' THEN
    UPDATE event_tickets
    SET
      quantity_sold = GREATEST(quantity_sold - NEW.quantity, 0),
      updated_at = now()
    WHERE id = NEW.ticket_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ticket_purchase_status_change ON ticket_purchases;
CREATE TRIGGER on_ticket_purchase_status_change
  AFTER UPDATE ON ticket_purchases
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION update_ticket_inventory();

-- Function: Generate QR code data for ticket
CREATE OR REPLACE FUNCTION generate_ticket_qr_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND NEW.qr_code_data IS NULL THEN
    NEW.qr_code_data := 'JETZZ-TICKET-' || NEW.id || '-' || encode(gen_random_bytes(8), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_ticket_qr_generation ON ticket_purchases;
CREATE TRIGGER on_ticket_qr_generation
  BEFORE INSERT OR UPDATE ON ticket_purchases
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_qr_code();

-- Function: Track ad impression
CREATE OR REPLACE FUNCTION track_ad_impression(
  p_user_id uuid,
  p_campaign_id uuid,
  p_ad_type text,
  p_ad_placement text,
  p_clicked boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
  impression_id uuid;
  revenue decimal(10,4);
BEGIN
  IF p_clicked THEN
    SELECT cost_per_click INTO revenue
    FROM partner_campaigns
    WHERE id = p_campaign_id;
  ELSE
    SELECT cost_per_impression INTO revenue
    FROM partner_campaigns
    WHERE id = p_campaign_id;
  END IF;

  INSERT INTO ad_impressions (user_id, campaign_id, ad_type, ad_placement, clicked, revenue_generated)
  VALUES (p_user_id, p_campaign_id, p_ad_type, p_ad_placement, p_clicked, revenue)
  RETURNING id INTO impression_id;

  IF p_clicked THEN
    UPDATE partner_campaigns
    SET
      clicks = clicks + 1,
      spent = spent + revenue,
      updated_at = now()
    WHERE id = p_campaign_id;
  ELSE
    UPDATE partner_campaigns
    SET
      impressions = impressions + 1,
      spent = spent + revenue,
      updated_at = now()
    WHERE id = p_campaign_id;
  END IF;

  RETURN impression_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Award coins for watching rewarded ad
CREATE OR REPLACE FUNCTION award_rewarded_ad_coins(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  ads_today integer;
  max_ads_per_day integer := 5;
BEGIN
  SELECT
    CASE
      WHEN last_rewarded_ad_date = CURRENT_DATE THEN rewarded_ads_today
      ELSE 0
    END
  INTO ads_today
  FROM user_ad_state
  WHERE user_id = p_user_id;

  IF ads_today >= max_ads_per_day THEN
    RETURN false;
  END IF;

  PERFORM award_coins(p_user_id, 50, 'rewarded_ad_watched', '{}');

  UPDATE user_ad_state
  SET
    rewarded_ads_today = CASE
      WHEN last_rewarded_ad_date = CURRENT_DATE THEN rewarded_ads_today + 1
      ELSE 1
    END,
    last_rewarded_ad_date = CURRENT_DATE,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate ticket revenue split
CREATE OR REPLACE FUNCTION calculate_ticket_revenue_split(
  p_purchase_id uuid
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  total decimal(10,2);
  platform_fee decimal(10,2);
  creator_amount decimal(10,2);
BEGIN
  SELECT total_price INTO total
  FROM ticket_purchases
  WHERE id = p_purchase_id;

  platform_fee := total * 0.10;
  creator_amount := total * 0.90;

  result := jsonb_build_object(
    'total', total,
    'platform_fee', platform_fee,
    'creator_amount', creator_amount
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
