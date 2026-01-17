/*
  # Add ticket_url column to scraped_events

  1. Changes
    - Add `ticket_url` column to `scraped_events` table for affiliate links
    
  2. Purpose
    - Store direct ticket purchase URLs from external sources (Ticketmaster, Eventbrite)
    - Enable affiliate link tracking and monetization
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraped_events' AND column_name = 'ticket_url'
  ) THEN
    ALTER TABLE scraped_events ADD COLUMN ticket_url text;
  END IF;
END $$;
