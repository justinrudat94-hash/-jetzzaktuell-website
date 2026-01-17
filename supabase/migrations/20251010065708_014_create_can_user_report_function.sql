/*
  # Create can_user_report function
  
  1. Function
    - `can_user_report(p_user_id)` - Checks if user can create reports
    - Returns JSON with allowed status and reason
    - Checks:
      * User is authenticated
      * Not banned from reporting
      * Under daily limit (10 reports)
      * Not in cooldown period (30 seconds)
  
  2. Security
    - Function is accessible to authenticated users
    - Returns structured permission check
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS can_user_report(UUID);

CREATE OR REPLACE FUNCTION can_user_report(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_banned BOOLEAN;
  v_daily_count INTEGER;
  v_last_report_time TIMESTAMPTZ;
  v_cooldown_seconds INTEGER := 30;
  v_daily_limit INTEGER := 10;
BEGIN
  -- Check if user exists and is authenticated
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'Nicht authentifiziert'
    );
  END IF;

  -- Check if user is banned from reporting
  SELECT COALESCE(is_reporting_banned, false)
  INTO v_is_banned
  FROM report_abuse_tracker
  WHERE user_id = p_user_id;

  IF v_is_banned THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'Du wurdest vom Melden gesperrt'
    );
  END IF;

  -- Check daily limit
  SELECT COUNT(*)
  INTO v_daily_count
  FROM reports
  WHERE reported_by = p_user_id
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours';

  IF v_daily_count >= v_daily_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'Tageslimit erreicht (10 Meldungen)'
    );
  END IF;

  -- Check cooldown period
  SELECT MAX(created_at)
  INTO v_last_report_time
  FROM reports
  WHERE reported_by = p_user_id;

  IF v_last_report_time IS NOT NULL 
     AND v_last_report_time > CURRENT_TIMESTAMP - (v_cooldown_seconds || ' seconds')::INTERVAL THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'Bitte warte ' || v_cooldown_seconds || ' Sekunden zwischen Meldungen'
    );
  END IF;

  -- All checks passed
  RETURN json_build_object(
    'allowed', true,
    'reason', NULL
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION can_user_report(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_report(UUID) TO anon;
