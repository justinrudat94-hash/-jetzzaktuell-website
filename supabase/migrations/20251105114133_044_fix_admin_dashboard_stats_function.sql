/*
  # Fix Admin Dashboard Stats Function

  1. Changes
    - Fix column name from 'date' to 'date_time' in events table query
    - Update function to use correct column name for filtering active events

  2. Security
    - Maintains existing security definer settings
    - No changes to RLS policies
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
    'active_events', (SELECT COUNT(*) FROM events WHERE date_time >= NOW()),
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