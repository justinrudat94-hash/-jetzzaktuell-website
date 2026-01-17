/*
  # Create Event Source Stats Function

  1. Function
    - `get_event_source_stats()` - Returns accurate event statistics by source
    - Much faster than loading all events in frontend
    - Properly counts Ticketmaster vs Manual events

  2. Returns
    - source: Event source (ticketmaster, manual, etc.)
    - total: Total events from this source
    - upcoming: Events in the future
    - today: Events starting today
    - this_week: Events in next 7 days
    - this_month: Events in next 30 days
*/

CREATE OR REPLACE FUNCTION get_event_source_stats()
RETURNS TABLE(
  source text,
  total bigint,
  upcoming bigint,
  today bigint,
  this_week bigint,
  this_month bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH event_sources AS (
    SELECT
      CASE
        WHEN external_event_id IS NOT NULL OR external_url LIKE '%ticketmaster%' THEN 'ticketmaster'
        WHEN external_url LIKE '%eventbrite%' THEN 'eventbrite'
        ELSE 'manual'
      END AS event_source,
      start_date
    FROM events
  )
  SELECT
    event_source AS source,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE start_date >= NOW())::bigint AS upcoming,
    COUNT(*) FILTER (WHERE DATE(start_date) = CURRENT_DATE)::bigint AS today,
    COUNT(*) FILTER (WHERE start_date >= NOW() AND start_date <= NOW() + INTERVAL '7 days')::bigint AS this_week,
    COUNT(*) FILTER (WHERE start_date >= NOW() AND start_date <= NOW() + INTERVAL '30 days')::bigint AS this_month
  FROM event_sources
  GROUP BY event_source
  ORDER BY total DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_event_source_stats() TO anon, authenticated, service_role;
