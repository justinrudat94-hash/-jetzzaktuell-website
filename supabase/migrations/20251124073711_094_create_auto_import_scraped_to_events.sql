/*
  # Auto-Import scraped_events to events

  1. Function
    - `import_scraped_to_events()` - Automatically imports scraped events to events table
    - Runs in batches to prevent timeouts
    - Links scraped_events to events

  2. Cron Job
    - Runs every 5 minutes
    - Imports up to 50 events per run
    - Fast and automatic

  3. Purpose
    - Automatically sync scraped_events → events
    - No manual intervention needed
*/

-- Function to import scraped events to events table
CREATE OR REPLACE FUNCTION import_scraped_to_events()
RETURNS TABLE(imported integer, skipped integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  scraped_record RECORD;
  existing_event_id uuid;
  new_event_id uuid;
  total_imported integer := 0;
  total_skipped integer := 0;
  system_user_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Process up to 50 events per run
  FOR scraped_record IN
    SELECT *
    FROM scraped_events
    WHERE status IN ('pending', 'approved')
      AND event_id IS NULL
    ORDER BY created_at ASC
    LIMIT 50
  LOOP
    BEGIN
      -- Check if event already exists
      SELECT id INTO existing_event_id
      FROM events
      WHERE external_event_id = scraped_record.external_id
      LIMIT 1;

      IF existing_event_id IS NOT NULL THEN
        -- Link to existing event
        UPDATE scraped_events
        SET 
          event_id = existing_event_id,
          status = 'approved',
          reviewed_at = NOW()
        WHERE id = scraped_record.id;

        total_skipped := total_skipped + 1;
      ELSE
        -- Create new event
        INSERT INTO events (
          user_id,
          title,
          description,
          category,
          location,
          latitude,
          longitude,
          start_date,
          end_date,
          image_url,
          max_participants,
          is_free,
          external_event_id,
          external_url,
          is_cancelled
        ) VALUES (
          system_user_id,
          scraped_record.title,
          COALESCE(scraped_record.description, 'Importiert von Ticketmaster'),
          COALESCE(scraped_record.category, 'Sonstiges'),
          scraped_record.location,
          scraped_record.latitude,
          scraped_record.longitude,
          scraped_record.start_date,
          scraped_record.end_date,
          scraped_record.image_url,
          999999,
          false,
          scraped_record.external_id,
          scraped_record.external_url,
          false
        )
        RETURNING id INTO new_event_id;

        -- Link scraped event to new event
        UPDATE scraped_events
        SET 
          event_id = new_event_id,
          status = 'approved',
          reviewed_at = NOW()
        WHERE id = scraped_record.id;

        total_imported := total_imported + 1;
      END IF;

    EXCEPTION 
      WHEN unique_violation THEN
        -- Duplicate, skip it
        total_skipped := total_skipped + 1;
        RAISE NOTICE 'Duplicate event skipped: %', scraped_record.external_id;
      WHEN OTHERS THEN
        -- Log error but continue
        RAISE WARNING 'Error importing event %: %', scraped_record.id, SQLERRM;
        total_skipped := total_skipped + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT total_imported, total_skipped;
END;
$$;

-- Create cron job to run every 5 minutes
SELECT cron.schedule(
  'auto-import-scraped-events',
  '*/5 * * * *', -- Every 5 minutes
  $$SELECT * FROM import_scraped_to_events();$$
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION import_scraped_to_events() TO postgres, service_role;

-- Run it once immediately to start
SELECT * FROM import_scraped_to_events();
