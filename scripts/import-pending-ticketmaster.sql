-- Import pending Ticketmaster events from scraped_events to events
-- This script manually imports events when the auto-scheduler has issues

DO $$
DECLARE
  scraped_record RECORD;
  venue_record JSONB;
  venue_name TEXT;
  venue_address TEXT;
  city_name TEXT;
  full_location TEXT;
  start_datetime TIMESTAMP WITH TIME ZONE;
  start_date_only DATE;
  start_time_only TIME;
  end_date_only DATE;
  end_time_only TIME;
  price_val NUMERIC;
  is_free_val BOOLEAN;
  new_event_id UUID;
BEGIN
  -- Loop through all pending Ticketmaster events
  FOR scraped_record IN
    SELECT * FROM scraped_events
    WHERE source_id IN (SELECT id FROM event_sources WHERE source_type = 'ticketmaster')
    AND event_id IS NULL
    AND status = 'pending'
  LOOP
    -- Extract venue information from raw_data
    venue_record := scraped_record.raw_data -> '_embedded' -> 'venues' -> 0;
    venue_name := venue_record ->> 'name';
    venue_address := venue_record -> 'address' ->> 'line1';
    city_name := venue_record -> 'city' ->> 'name';

    -- Build full location string
    full_location := CONCAT_WS(', ',
      NULLIF(venue_name, ''),
      NULLIF(venue_address, ''),
      NULLIF(city_name, '')
    );

    IF full_location = '' THEN
      full_location := scraped_record.location;
    END IF;

    -- Extract date and time
    start_datetime := scraped_record.start_date;
    start_date_only := start_datetime::DATE;
    start_time_only := start_datetime::TIME;

    IF scraped_record.end_date IS NOT NULL THEN
      end_date_only := scraped_record.end_date::DATE;
      end_time_only := scraped_record.end_date::TIME;
    END IF;

    -- Extract price information
    price_val := NULL;
    is_free_val := FALSE;

    IF scraped_record.raw_data -> 'priceRanges' IS NOT NULL THEN
      price_val := (scraped_record.raw_data -> 'priceRanges' -> 0 ->> 'min')::NUMERIC;
      IF price_val = 0 THEN
        is_free_val := TRUE;
      END IF;
    END IF;

    -- Insert into events table
    INSERT INTO events (
      user_id,
      title,
      description,
      category,
      start_date,
      start_time,
      end_date,
      end_time,
      location,
      city,
      latitude,
      longitude,
      preview_image_url,
      ticket_url,
      price,
      is_free,
      external_source,
      external_id,
      is_auto_imported,
      is_published
    ) VALUES (
      NULL,
      scraped_record.title,
      scraped_record.description,
      scraped_record.category,
      start_date_only,
      start_time_only,
      end_date_only,
      end_time_only,
      full_location,
      COALESCE(city_name, scraped_record.location, 'Deutschland'),
      scraped_record.latitude,
      scraped_record.longitude,
      scraped_record.image_url,
      scraped_record.ticket_url,
      price_val,
      is_free_val,
      'ticketmaster',
      scraped_record.external_id,
      TRUE,
      TRUE
    )
    ON CONFLICT (external_id) DO NOTHING
    RETURNING id INTO new_event_id;

    -- Update scraped_events with the new event_id
    IF new_event_id IS NOT NULL THEN
      UPDATE scraped_events
      SET
        event_id = new_event_id,
        status = 'approved',
        reviewed_at = NOW()
      WHERE id = scraped_record.id;

      RAISE NOTICE 'Imported: % (ID: %)', scraped_record.title, new_event_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Import completed!';
END $$;

-- Show summary
SELECT
  COUNT(*) as total_imported,
  COUNT(DISTINCT category) as categories
FROM events
WHERE external_source = 'ticketmaster'
AND is_auto_imported = TRUE;
