/*
  # Enhanced Reporting & Moderation System

  1. New Tables
    - `user_violations`
      - Tracks all user violations with severity levels
      - Category-based tracking (harassment, sexual, hate, spam, etc.)
      - Automatic cleanup after 30 days
      - Links to source entity for context

    - `report_abuse_tracker`
      - Tracks false reports by users
      - Automatic penalties for report abuse
      - Temporary ban system for repeat offenders

  2. Views
    - `user_strike_summary`
      - Real-time view of user strikes in last 30 days
      - Categorized by severity (high, medium, low)

    - `moderation_analytics`
      - Admin dashboard analytics
      - Daily aggregation of reports and violations
      - AI vs user-flagged metrics

  3. Functions
    - `reset_old_violations`: Cleanup violations older than 30 days
    - `apply_false_report_penalty`: Automatic penalties for false reports
    - `check_user_suspension`: Check if user is suspended
    - `apply_strike_penalty`: Apply automatic strike penalties

  4. Security
    - RLS enabled on all tables
    - Users can view their own violations
    - Admins have full access
    - System can insert violations automatically

  5. Strike Logic
    - 3+ high strikes = 7 day suspension
    - 5+ medium strikes = 3 day suspension
    - 3+ false reports = warning
    - 5+ false reports = 7 day ban from reporting
    - 6+ false reports = account review
*/

-- Create user_violations table
CREATE TABLE IF NOT EXISTS user_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  severity text NOT NULL,
  flagged_by text NOT NULL,
  source_entity text,
  entity_id uuid,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  admin_notes text
);

-- Create report_abuse_tracker table
CREATE TABLE IF NOT EXISTS report_abuse_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  false_reports integer DEFAULT 0 NOT NULL,
  warnings integer DEFAULT 0 NOT NULL,
  reporting_ban_until timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(reporter_id)
);

-- Create user_suspensions table
CREATE TABLE IF NOT EXISTS user_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  suspended_until timestamptz NOT NULL,
  suspended_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE user_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_abuse_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_violations
CREATE POLICY "Users can view own violations"
  ON user_violations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all violations"
  ON user_violations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert violations"
  ON user_violations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update violations"
  ON user_violations FOR UPDATE
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

-- RLS Policies for report_abuse_tracker
CREATE POLICY "Users can view own abuse tracker"
  ON report_abuse_tracker FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Admins can view all abuse trackers"
  ON report_abuse_tracker FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert abuse trackers"
  ON report_abuse_tracker FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update abuse trackers"
  ON report_abuse_tracker FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for user_suspensions
CREATE POLICY "Users can view own suspensions"
  ON user_suspensions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all suspensions"
  ON user_suspensions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert suspensions"
  ON user_suspensions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update suspensions"
  ON user_suspensions FOR UPDATE
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

-- Create user_strike_summary view
CREATE OR REPLACE VIEW user_strike_summary AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE severity = 'high' AND created_at > NOW() - INTERVAL '30 days' AND NOT resolved) AS high_strikes,
  COUNT(*) FILTER (WHERE severity = 'medium' AND created_at > NOW() - INTERVAL '30 days' AND NOT resolved) AS medium_strikes,
  COUNT(*) FILTER (WHERE severity = 'low' AND created_at > NOW() - INTERVAL '30 days' AND NOT resolved) AS low_strikes,
  MAX(created_at) AS last_violation_at
FROM user_violations
GROUP BY user_id;

-- Create moderation_analytics view
CREATE OR REPLACE VIEW moderation_analytics AS
SELECT
  date_trunc('day', uv.created_at) AS day,
  COUNT(*) AS total_violations,
  COUNT(*) FILTER (WHERE uv.resolved = false) AS pending,
  COUNT(*) FILTER (WHERE uv.resolved = true) AS resolved,
  COUNT(*) FILTER (WHERE uv.flagged_by = 'AI') AS ai_flagged,
  COUNT(*) FILTER (WHERE uv.flagged_by = 'User') AS user_reported,
  COUNT(DISTINCT uv.user_id) AS unique_offenders,
  COUNT(*) FILTER (WHERE uv.severity = 'high') AS high_severity_count,
  COUNT(*) FILTER (WHERE uv.severity = 'medium') AS medium_severity_count,
  COUNT(*) FILTER (WHERE uv.severity = 'low') AS low_severity_count
FROM user_violations uv
GROUP BY 1
ORDER BY day DESC;

-- Function to reset old violations (run daily)
CREATE OR REPLACE FUNCTION reset_old_violations()
RETURNS void AS $$
BEGIN
  UPDATE user_violations
  SET resolved = true,
      resolved_at = now(),
      admin_notes = 'Auto-resolved: older than 30 days'
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND resolved = false;

  UPDATE user_suspensions
  SET is_active = false
  WHERE suspended_until < NOW()
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply false report penalty
CREATE OR REPLACE FUNCTION apply_false_report_penalty(p_reporter_id uuid)
RETURNS void AS $$
DECLARE
  v_abuse_count integer;
  v_ban_duration interval;
BEGIN
  INSERT INTO report_abuse_tracker (reporter_id, false_reports, warnings, updated_at)
  VALUES (p_reporter_id, 1, 0, now())
  ON CONFLICT (reporter_id)
  DO UPDATE SET
    false_reports = report_abuse_tracker.false_reports + 1,
    updated_at = now()
  RETURNING false_reports INTO v_abuse_count;

  IF v_abuse_count = 3 THEN
    INSERT INTO user_violations(user_id, category, severity, flagged_by, description)
    VALUES (p_reporter_id, 'false_reporting', 'low', 'System', 'Warning: 3 false reports detected');

    UPDATE report_abuse_tracker
    SET warnings = warnings + 1
    WHERE reporter_id = p_reporter_id;

  ELSIF v_abuse_count = 5 THEN
    v_ban_duration := INTERVAL '7 days';

    UPDATE report_abuse_tracker
    SET reporting_ban_until = now() + v_ban_duration,
        warnings = warnings + 1
    WHERE reporter_id = p_reporter_id;

    INSERT INTO user_violations(user_id, category, severity, flagged_by, description)
    VALUES (p_reporter_id, 'false_reporting', 'medium', 'System', 'Temporary 7-day reporting ban for repeated false reports');

  ELSIF v_abuse_count >= 6 THEN
    INSERT INTO user_violations(user_id, category, severity, flagged_by, description)
    VALUES (p_reporter_id, 'false_reporting', 'high', 'System', 'Severe: 6+ false reports - account under review');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is suspended
CREATE OR REPLACE FUNCTION check_user_suspension(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_suspension user_suspensions;
  v_result jsonb;
BEGIN
  SELECT * INTO v_suspension
  FROM user_suspensions
  WHERE user_id = p_user_id
    AND is_active = true
    AND suspended_until > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_suspension IS NULL THEN
    v_result := jsonb_build_object(
      'suspended', false
    );
  ELSE
    v_result := jsonb_build_object(
      'suspended', true,
      'reason', v_suspension.reason,
      'suspended_until', v_suspension.suspended_until,
      'days_remaining', EXTRACT(DAY FROM (v_suspension.suspended_until - NOW()))
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply automatic strike penalty
CREATE OR REPLACE FUNCTION apply_strike_penalty(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_strikes user_strike_summary;
  v_suspension_days integer;
  v_reason text;
BEGIN
  SELECT * INTO v_strikes
  FROM user_strike_summary
  WHERE user_id = p_user_id;

  IF v_strikes IS NULL THEN
    RETURN;
  END IF;

  IF v_strikes.high_strikes >= 3 THEN
    v_suspension_days := 7;
    v_reason := format('Automatic 7-day suspension: %s high severity violations in 30 days', v_strikes.high_strikes);

    INSERT INTO user_suspensions (user_id, reason, suspended_until, suspended_by)
    VALUES (p_user_id, v_reason, NOW() + (v_suspension_days || ' days')::interval, NULL);

  ELSIF v_strikes.medium_strikes >= 5 THEN
    v_suspension_days := 3;
    v_reason := format('Automatic 3-day suspension: %s medium severity violations in 30 days', v_strikes.medium_strikes);

    INSERT INTO user_suspensions (user_id, reason, suspended_until, suspended_by)
    VALUES (p_user_id, v_reason, NOW() + (v_suspension_days || ' days')::interval, NULL);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can report (not banned)
CREATE OR REPLACE FUNCTION can_user_report(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_tracker report_abuse_tracker;
BEGIN
  SELECT * INTO v_tracker
  FROM report_abuse_tracker
  WHERE reporter_id = p_user_id;

  IF v_tracker IS NULL THEN
    RETURN true;
  END IF;

  IF v_tracker.reporting_ban_until IS NOT NULL
     AND v_tracker.reporting_ban_until > NOW() THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_violations_user_id ON user_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_violations_created_at ON user_violations(created_at);
CREATE INDEX IF NOT EXISTS idx_user_violations_severity ON user_violations(severity);
CREATE INDEX IF NOT EXISTS idx_user_violations_resolved ON user_violations(resolved);
CREATE INDEX IF NOT EXISTS idx_report_abuse_reporter ON report_abuse_tracker(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user ON user_suspensions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_until ON user_suspensions(suspended_until);
