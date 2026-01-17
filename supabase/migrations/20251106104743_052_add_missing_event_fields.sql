/*
  # Add Missing Event Fields

  ## Overview
  This migration adds all missing fields to the events table that are required by the event creation form.

  ## Changes
  1. Add location fields: postcode, city, street
  2. Add date/time fields: start_date, start_time, end_date, end_time, duration_type
  3. Add media fields: preview_image_url, image_urls, video_url
  4. Add event details: age_rating, additional_info, sponsors
  5. Add pricing fields: is_free, price
  6. Add ticket fields: tickets_required, ticket_link, id_required, vouchers_available
  7. Add attendees counter
  8. Update lineup from text to jsonb for structured data

  ## Notes
  - All new fields are nullable to maintain compatibility with existing data
  - lineup changed from text to jsonb to store structured artist data
*/

-- Add location fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS street text;

-- Add date/time fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time time;
ALTER TABLE events ADD COLUMN IF NOT EXISTS duration_type text DEFAULT 'Einzeltermin';

-- Add media fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS preview_image_url text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS video_url text;

-- Add event details
ALTER TABLE events ADD COLUMN IF NOT EXISTS age_rating text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS additional_info text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS sponsors text;

-- Add pricing fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT true;
ALTER TABLE events ADD COLUMN IF NOT EXISTS price numeric(10,2);

-- Add ticket fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS tickets_required boolean DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_link text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS id_required boolean DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS vouchers_available boolean DEFAULT false;

-- Add attendees counter
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendees integer DEFAULT 0;

-- Update lineup to jsonb if it's text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' 
    AND column_name = 'lineup' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE events ALTER COLUMN lineup TYPE jsonb USING lineup::jsonb;
  END IF;
END $$;
