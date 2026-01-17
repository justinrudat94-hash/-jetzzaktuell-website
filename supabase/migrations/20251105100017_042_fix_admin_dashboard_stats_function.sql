/*
  # Fix admin dashboard stats function

  1. Changes
    - Update `get_admin_dashboard_stats` function to work with new schema
    - Now includes live_streams table statistics
    - Returns comprehensive dashboard statistics

  2. Purpose
    - Provide admin dashboard with current system statistics
    - Include event, user, report, and live stream counts
*/

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_events', (SELECT COUNT(*) FROM events),
    'active_events', (SELECT COUNT(*) FROM events WHERE date >= NOW()),
    'pending_reports', (SELECT COUNT(*) FROM reports WHERE status = 'pending'),
    'active_live_streams', (SELECT COUNT(*) FROM live_streams WHERE status = 'live'),
    'total_live_streams', (SELECT COUNT(*) FROM live_streams),
    'pending_moderation', (
      SELECT COUNT(*) 
      FROM scraped_events 
      WHERE moderation_status = 'pending'
    )
  ) INTO stats;

  RETURN stats;
END;
$$;

COMMENT ON FUNCTION get_admin_dashboard_stats IS 'Get comprehensive admin dashboard statistics';
