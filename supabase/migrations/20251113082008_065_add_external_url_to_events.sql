/*
  # Add external_url column to events table

  1. Changes
    - Add `external_url` column to `events` table for storing original event URLs
    - This is used for imported events from Ticketmaster, Eventbrite, etc.

  2. Notes
    - Column is nullable as not all events have an external URL
    - User-created events won't have this field populated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'external_url'
  ) THEN
    ALTER TABLE events ADD COLUMN external_url text;
    COMMENT ON COLUMN events.external_url IS 'Original URL from external event source (Ticketmaster, Eventbrite, etc)';
  END IF;
END $$;
