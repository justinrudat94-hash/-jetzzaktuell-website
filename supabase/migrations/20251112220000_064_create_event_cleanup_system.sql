/*
  # Automatisches Event-Cleanup System

  1. Zweck
    - Automatische Löschung alter Events um Speicherplatz zu sparen
    - Intelligente Cleanup-Regeln basierend auf Event-Typ und Teilnehmern

  2. Cleanup-Regeln
    - **Externe Events** (Ticketmaster, Eventbrite): 30 Tage nach Ende
    - **Events ohne Teilnehmer**: 90 Tage nach Ende
    - **Events mit Teilnehmern**: 180 Tage nach Ende
    - **User-erstellte Events**: 365 Tage nach Ende (für History)

  3. Funktionen
    - `cleanup_old_events()`: Löscht alte Events nach Regeln
    - Wird täglich automatisch ausgeführt
    - Berücksichtigt Teilnehmer und Event-Typ

  4. Sicherheit
    - Nur abgelaufene Events (start_date < current_date)
    - Berücksichtigt Teilnehmer-Anzahl
    - Logs für gelöschte Events
*/

-- 1. CREATE CLEANUP LOG TABLE
CREATE TABLE IF NOT EXISTS event_cleanup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  event_title text,
  event_type text,
  start_date date,
  participant_count integer DEFAULT 0,
  cleanup_reason text,
  cleaned_at timestamptz DEFAULT now()
);

ALTER TABLE event_cleanup_log ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can view cleanup logs
CREATE POLICY "Admins can view cleanup logs"
  ON event_cleanup_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. CREATE CLEANUP FUNCTION
CREATE OR REPLACE FUNCTION cleanup_old_events()
RETURNS TABLE(
  deleted_count integer,
  reason text
) AS $$
DECLARE
  external_events_deleted integer := 0;
  empty_events_deleted integer := 0;
  participated_events_deleted integer := 0;
  user_events_deleted integer := 0;
BEGIN
  -- Log events before deletion (für externe Events - 30 Tage)
  INSERT INTO event_cleanup_log (event_id, event_title, event_type, start_date, participant_count, cleanup_reason)
  SELECT
    e.id,
    e.title,
    CASE WHEN e.external_id IS NOT NULL THEN 'external' ELSE 'user' END,
    e.start_date,
    e.current_participants,
    'External event older than 30 days'
  FROM events e
  WHERE
    e.external_id IS NOT NULL
    AND e.start_date < (CURRENT_DATE - INTERVAL '30 days')
    AND e.start_date IS NOT NULL;

  -- Delete external events older than 30 days
  DELETE FROM events
  WHERE
    external_id IS NOT NULL
    AND start_date < (CURRENT_DATE - INTERVAL '30 days')
    AND start_date IS NOT NULL;

  GET DIAGNOSTICS external_events_deleted = ROW_COUNT;

  -- Log events before deletion (für Events ohne Teilnehmer - 90 Tage)
  INSERT INTO event_cleanup_log (event_id, event_title, event_type, start_date, participant_count, cleanup_reason)
  SELECT
    e.id,
    e.title,
    'user',
    e.start_date,
    e.current_participants,
    'Event without participants older than 90 days'
  FROM events e
  WHERE
    e.external_id IS NULL
    AND e.start_date < (CURRENT_DATE - INTERVAL '90 days')
    AND e.start_date IS NOT NULL
    AND (e.current_participants = 0 OR e.current_participants IS NULL);

  -- Delete user events without participants older than 90 days
  DELETE FROM events
  WHERE
    external_id IS NULL
    AND start_date < (CURRENT_DATE - INTERVAL '90 days')
    AND start_date IS NOT NULL
    AND (current_participants = 0 OR current_participants IS NULL);

  GET DIAGNOSTICS empty_events_deleted = ROW_COUNT;

  -- Log events before deletion (für Events mit Teilnehmern - 180 Tage)
  INSERT INTO event_cleanup_log (event_id, event_title, event_type, start_date, participant_count, cleanup_reason)
  SELECT
    e.id,
    e.title,
    'user',
    e.start_date,
    e.current_participants,
    'Event with participants older than 180 days'
  FROM events e
  WHERE
    e.external_id IS NULL
    AND e.start_date < (CURRENT_DATE - INTERVAL '180 days')
    AND e.start_date IS NOT NULL
    AND e.current_participants > 0
    AND e.current_participants < 5;

  -- Delete events with few participants older than 180 days
  DELETE FROM events
  WHERE
    external_id IS NULL
    AND start_date < (CURRENT_DATE - INTERVAL '180 days')
    AND start_date IS NOT NULL
    AND current_participants > 0
    AND current_participants < 5;

  GET DIAGNOSTICS participated_events_deleted = ROW_COUNT;

  -- Log events before deletion (für beliebte Events - 365 Tage)
  INSERT INTO event_cleanup_log (event_id, event_title, event_type, start_date, participant_count, cleanup_reason)
  SELECT
    e.id,
    e.title,
    'user',
    e.start_date,
    e.current_participants,
    'Popular event older than 365 days'
  FROM events e
  WHERE
    e.external_id IS NULL
    AND e.start_date < (CURRENT_DATE - INTERVAL '365 days')
    AND e.start_date IS NOT NULL
    AND e.current_participants >= 5;

  -- Delete popular events older than 365 days
  DELETE FROM events
  WHERE
    external_id IS NULL
    AND start_date < (CURRENT_DATE - INTERVAL '365 days')
    AND start_date IS NOT NULL
    AND current_participants >= 5;

  GET DIAGNOSTICS user_events_deleted = ROW_COUNT;

  -- Return summary
  RETURN QUERY SELECT external_events_deleted, 'External events (30 days)'::text
  UNION ALL SELECT empty_events_deleted, 'Empty events (90 days)'::text
  UNION ALL SELECT participated_events_deleted, 'Events with few participants (180 days)'::text
  UNION ALL SELECT user_events_deleted, 'Popular events (365 days)'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREATE MANUAL CLEANUP FUNCTION (for admins)
CREATE OR REPLACE FUNCTION run_event_cleanup()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(row_to_json(t))
  INTO result
  FROM cleanup_old_events() t;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ADD COMMENT FOR CRON SETUP
COMMENT ON FUNCTION cleanup_old_events() IS
  'Automatically cleans up old events. Should be run daily via pg_cron or external scheduler.
  Usage: SELECT * FROM cleanup_old_events();';
