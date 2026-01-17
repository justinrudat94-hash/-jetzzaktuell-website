/*
  # Create Live-Stream Ad Tracking System

  1. New Tables
    - `livestream_ad_events`
      - Track Pre-Roll and Mid-Roll ad events
      - Linked to live_streams table
      - Track completion rates and revenue

  2. Security
    - Enable RLS on livestream_ad_events
    - Admins can view all ad events
    - Stream owners can view their own stream ad events
*/

-- Create livestream_ad_events table
CREATE TABLE IF NOT EXISTS livestream_ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES live_streams(id) ON DELETE CASCADE NOT NULL,
  ad_type text NOT NULL CHECK (ad_type IN ('pre_roll', 'mid_roll')),
  ad_position integer, -- For mid-roll: position in seconds
  impressions integer DEFAULT 0,
  completions integer DEFAULT 0,
  skips integer DEFAULT 0,
  revenue_cents integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE livestream_ad_events ENABLE ROW LEVEL SECURITY;

-- Policies for livestream_ad_events
CREATE POLICY "Admins can manage all livestream ad events"
  ON livestream_ad_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Event owners can view their stream ad events"
  ON livestream_ad_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM live_streams ls
      INNER JOIN events e ON e.id = ls.event_id
      WHERE ls.id = livestream_ad_events.stream_id
      AND e.user_id::uuid = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_livestream_ad_events_stream_id
  ON livestream_ad_events(stream_id);

CREATE INDEX IF NOT EXISTS idx_livestream_ad_events_ad_type
  ON livestream_ad_events(ad_type);

CREATE INDEX IF NOT EXISTS idx_livestream_ad_events_created_at
  ON livestream_ad_events(created_at DESC);

-- Function to calculate completion rate
CREATE OR REPLACE FUNCTION calculate_livestream_ad_completion_rate(p_stream_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_impressions integer;
  v_total_completions integer;
BEGIN
  SELECT
    COALESCE(SUM(impressions), 0),
    COALESCE(SUM(completions), 0)
  INTO v_total_impressions, v_total_completions
  FROM livestream_ad_events
  WHERE stream_id = p_stream_id;

  IF v_total_impressions = 0 THEN
    RETURN 0;
  END IF;

  RETURN (v_total_completions::numeric / v_total_impressions::numeric) * 100;
END;
$$;

-- Function to get livestream ad stats
CREATE OR REPLACE FUNCTION get_livestream_ad_stats(p_days integer DEFAULT 30)
RETURNS TABLE (
  total_streams bigint,
  total_pre_roll_impressions bigint,
  total_mid_roll_impressions bigint,
  total_completions bigint,
  total_skips bigint,
  total_revenue_cents bigint,
  avg_completion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT stream_id)::bigint,
    COALESCE(SUM(CASE WHEN ad_type = 'pre_roll' THEN impressions ELSE 0 END), 0)::bigint,
    COALESCE(SUM(CASE WHEN ad_type = 'mid_roll' THEN impressions ELSE 0 END), 0)::bigint,
    COALESCE(SUM(completions), 0)::bigint,
    COALESCE(SUM(skips), 0)::bigint,
    COALESCE(SUM(revenue_cents), 0)::bigint,
    CASE
      WHEN SUM(impressions) > 0 THEN
        (SUM(completions)::numeric / SUM(impressions)::numeric) * 100
      ELSE 0
    END
  FROM livestream_ad_events
  WHERE created_at >= now() - (p_days || ' days')::interval;
END;
$$;