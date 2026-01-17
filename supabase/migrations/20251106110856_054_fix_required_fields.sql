/*
  # Fix required fields in events table

  ## Overview
  The events table has NOT NULL constraints on latitude, longitude, and date_time
  but the application code can send null values or doesn't send them at all.

  ## Changes
  1. Make latitude and longitude nullable (for online events)
  2. Make date_time nullable (app uses start_date/start_time instead)

  ## Notes
  - This allows events without physical location (online events)
  - The app now uses start_date/start_time/end_date/end_time instead of date_time
  - Maintains backward compatibility with existing events
*/

-- Make latitude and longitude nullable for online events
ALTER TABLE events ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE events ALTER COLUMN longitude DROP NOT NULL;

-- Make date_time nullable since app uses start_date/start_time instead
ALTER TABLE events ALTER COLUMN date_time DROP NOT NULL;
