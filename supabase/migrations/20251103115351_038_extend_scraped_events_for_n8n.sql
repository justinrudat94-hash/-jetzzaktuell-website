/*
  # Extend scraped_events table for n8n workflow

  1. Changes to scraped_events table
    - Add `price` (text) - Event price information
    - Add `contact_email` (text) - Contact email
    - Add `contact_phone` (text) - Contact phone number
    - Add `contact_website` (text) - Contact website URL
    - Add `ticket_link` (text) - Ticket purchase link
    - Add `image_photographer` (text) - Pexels photographer name
    - Add `image_photographer_url` (text) - Pexels photographer profile URL
    - Add `quality_score` (integer) - AI quality score (0-100)

  2. Security
    - Service Role bypasses RLS automatically
*/

-- Add missing columns to scraped_events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraped_events' AND column_name = 'price'
  ) THEN
    ALTER TABLE scraped_events ADD COLUMN price text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraped_events' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE scraped_events ADD COLUMN contact_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraped_events' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE scraped_events ADD COLUMN contact_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraped_events' AND column_name = 'contact_website'
  ) THEN
    ALTER TABLE scraped_events ADD COLUMN contact_website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraped_events' AND column_name = 'ticket_link'
  ) THEN
    ALTER TABLE scraped_events ADD COLUMN ticket_link text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraped_events' AND column_name = 'image_photographer'
  ) THEN
    ALTER TABLE scraped_events ADD COLUMN image_photographer text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraped_events' AND column_name = 'image_photographer_url'
  ) THEN
    ALTER TABLE scraped_events ADD COLUMN image_photographer_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraped_events' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE scraped_events ADD COLUMN quality_score integer DEFAULT 0;
  END IF;
END $$;