/*
  # Report and Moderation System

  1. New Tables
    - `reports`
      - Stores user reports for profiles, events, livestreams, comments, messages
      - Tracks report status and admin reviews
      - Includes AI moderation results

    - `moderation_logs`
      - Logs all AI moderation checks
      - Stores AI scores and risk assessments
      - Tracks which content was auto-approved or blocked

    - `report_limits`
      - Tracks rate limiting per user
      - Prevents spam and abuse
      - Daily reset and cooldown tracking

  2. Enums
    - entity_type: Types of content that can be reported
    - report_reason: Categories for report reasons
    - report_status: Current state of the report
    - risk_level: AI-assessed risk level
    - moderation_action: Automated action taken

  3. Security
    - Enable RLS on all tables
    - Users can only create reports and view their own
    - Admins can view and manage all reports
    - Moderation logs readable by admins only

  4. Functions
    - check_report_limit: Validates rate limiting rules
    - auto_escalate_content: Auto-hides content based on AI + user reports
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM ('profile', 'event', 'livestream', 'comment', 'message');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM (
    'inappropriate_content',
    'harassment',
    'fake_spam',
    'scam',
    'minor_protection',
    'copyright',
    'illegal',
    'technical',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'action_taken', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('safe', 'low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE moderation_action AS ENUM ('approved', 'blocked', 'needs_review', 'auto_hidden');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_entity_type entity_type NOT NULL,
  reported_entity_id uuid NOT NULL,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason_category report_reason NOT NULL,
  reason_text text,
  status report_status DEFAULT 'pending' NOT NULL,
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  ai_pre_checked boolean DEFAULT false,
  ai_confidence float,
  priority_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(reporter_id, reported_entity_type, reported_entity_id)
);

-- Moderation logs table
CREATE TABLE IF NOT EXISTS moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  content_text text,
  ai_service text DEFAULT 'openai' NOT NULL,
  ai_response jsonb,
  risk_level risk_level NOT NULL,
  flagged_categories text[],
  auto_action moderation_action NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Report limits table
CREATE TABLE IF NOT EXISTS report_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reports_today integer DEFAULT 0 NOT NULL,
  last_report_at timestamptz,
  daily_reset_at timestamptz DEFAULT (CURRENT_DATE + INTERVAL '1 day') NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_limits ENABLE ROW LEVEL SECURITY;

-- Add is_admin column to profiles first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Reports policies
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM reports
      WHERE reporter_id = auth.uid()
      AND reported_entity_type = reports.reported_entity_type
      AND reported_entity_id = reports.reported_entity_id
    )
  );

CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
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

-- Moderation logs policies
CREATE POLICY "Admins can view moderation logs"
  ON moderation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Service role can insert moderation logs"
  ON moderation_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Report limits policies
CREATE POLICY "Users can view own report limits"
  ON report_limits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own report limits"
  ON report_limits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own report limits"
  ON report_limits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to check and enforce report limits
CREATE OR REPLACE FUNCTION check_report_limit(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_limit_record report_limits;
  v_cooldown_seconds integer := 30;
  v_max_daily_reports integer := 10;
  v_result jsonb;
BEGIN
  -- Get or create limit record
  SELECT * INTO v_limit_record
  FROM report_limits
  WHERE user_id = p_user_id;

  -- Create if not exists
  IF v_limit_record IS NULL THEN
    INSERT INTO report_limits (user_id, reports_today, daily_reset_at)
    VALUES (p_user_id, 0, CURRENT_DATE + INTERVAL '1 day')
    RETURNING * INTO v_limit_record;
  END IF;

  -- Reset daily counter if needed
  IF CURRENT_TIMESTAMP >= v_limit_record.daily_reset_at THEN
    UPDATE report_limits
    SET reports_today = 0,
        daily_reset_at = CURRENT_DATE + INTERVAL '1 day'
    WHERE user_id = p_user_id
    RETURNING * INTO v_limit_record;
  END IF;

  -- Check cooldown (30 seconds between reports)
  IF v_limit_record.last_report_at IS NOT NULL
     AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_limit_record.last_report_at)) < v_cooldown_seconds THEN
    v_result := jsonb_build_object(
      'allowed', false,
      'reason', 'cooldown',
      'wait_seconds', v_cooldown_seconds - EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_limit_record.last_report_at))::integer
    );
    RETURN v_result;
  END IF;

  -- Check daily limit
  IF v_limit_record.reports_today >= v_max_daily_reports THEN
    v_result := jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'reset_at', v_limit_record.daily_reset_at
    );
    RETURN v_result;
  END IF;

  -- Update limit record
  UPDATE report_limits
  SET reports_today = reports_today + 1,
      last_report_at = CURRENT_TIMESTAMP
  WHERE user_id = p_user_id;

  v_result := jsonb_build_object('allowed', true);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-escalate content based on AI + user reports
CREATE OR REPLACE FUNCTION auto_escalate_content(
  p_entity_type entity_type,
  p_entity_id uuid
)
RETURNS void AS $$
DECLARE
  v_report_count integer;
  v_ai_risk risk_level;
  v_should_hide boolean := false;
BEGIN
  -- Count reports for this entity
  SELECT COUNT(*) INTO v_report_count
  FROM reports
  WHERE reported_entity_type = p_entity_type
    AND reported_entity_id = p_entity_id
    AND status = 'pending';

  -- Get latest AI risk assessment
  SELECT risk_level INTO v_ai_risk
  FROM moderation_logs
  WHERE content_id = p_entity_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Auto-hide logic
  IF v_ai_risk = 'critical' AND v_report_count >= 3 THEN
    v_should_hide := true;
  ELSIF v_ai_risk = 'high' AND v_report_count >= 5 THEN
    v_should_hide := true;
  ELSIF v_report_count >= 10 THEN
    v_should_hide := true;
  END IF;

  -- Apply auto-hide based on entity type
  IF v_should_hide THEN
    CASE p_entity_type
      WHEN 'event' THEN
        UPDATE events SET is_hidden = true WHERE id = p_entity_id;
      WHEN 'livestream' THEN
        UPDATE live_streams SET is_hidden = true WHERE id = p_entity_id;
      ELSE
        NULL;
    END CASE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add is_hidden column to events if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE events ADD COLUMN is_hidden boolean DEFAULT false;
  END IF;
END $$;

-- Add is_hidden column to live_streams if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'live_streams'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_streams' AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE live_streams ADD COLUMN is_hidden boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_entity ON reports(reported_entity_type, reported_entity_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_content ON moderation_logs(content_id);
CREATE INDEX IF NOT EXISTS idx_report_limits_user ON report_limits(user_id);
