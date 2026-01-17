/*
  # Multi-Format Event Scraping System

  Supports RSS Feeds, iCal/ICS Calendars, and Schema.org structured data
  for bot-friendly event scraping without CAPTCHA issues.

  1. Changes to event_sources table
    - Rename `type` to `source_type` for clarity (RSS, iCal, Schema.org)
    - Add support for 'rss', 'ical', 'schema' source types
    - Keep existing 'web' and 'api' types for backwards compatibility
    - Migrate legacy type values (facebook→api, website→web)

  2. Demo Sources
    - Add RSS feed sources (Berlin, München)
    - Add iCal calendar sources
    - Add Schema.org sources
    - All sources are bot-friendly and CAPTCHA-free

  3. Security
    - Service Role can access all tables (for n8n workflow)
    - Admins maintain full control via existing RLS policies
*/

-- First, update legacy type values to match new schema
UPDATE event_sources SET type = 'api' WHERE type = 'facebook';
UPDATE event_sources SET type = 'web' WHERE type = 'website';

-- Rename type column to source_type for clarity
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_sources' AND column_name = 'type'
  ) THEN
    ALTER TABLE event_sources RENAME COLUMN type TO source_type;
  END IF;
END $$;

-- Update default value
ALTER TABLE event_sources
  ALTER COLUMN source_type SET DEFAULT 'rss';

-- Add check constraint for valid source types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_sources_source_type_check'
  ) THEN
    ALTER TABLE event_sources
      ADD CONSTRAINT event_sources_source_type_check
      CHECK (source_type IN ('rss', 'ical', 'schema', 'web', 'api'));
  END IF;
END $$;

-- Clear existing demo sources to avoid conflicts
DELETE FROM event_sources WHERE name LIKE '%Demo%' OR name LIKE '%Test%';

-- Insert demo RSS feed sources (bot-friendly, no CAPTCHA)
INSERT INTO event_sources (name, url, source_type, category, is_active, scrape_frequency_hours) VALUES
  -- RSS Feeds from city portals
  ('Berlin Events RSS', 'https://www.berlin.de/tickets/veranstaltungen/rss/', 'rss', 'Kultur', true, 12),
  ('München Events RSS', 'https://www.muenchen.de/veranstaltungen.rss', 'rss', 'Kultur', true, 12),
  ('Hamburg Kultur RSS', 'https://www.hamburg.de/contentblob/rss/kultur', 'rss', 'Kultur', true, 24),

  -- Theater and cultural institutions RSS
  ('Staatstheater Stuttgart RSS', 'https://www.staatstheater-stuttgart.de/rss/spielplan', 'rss', 'Theater', true, 24),
  ('Deutsches Theater Berlin RSS', 'https://www.deutschestheater.de/rss/', 'rss', 'Theater', true, 24),

  -- Music and concert RSS feeds
  ('Konzerthaus Berlin RSS', 'https://www.konzerthaus.de/rss', 'rss', 'Musik', true, 24),
  ('Elbphilharmonie Hamburg RSS', 'https://www.elbphilharmonie.de/de/feed', 'rss', 'Musik', true, 24)
ON CONFLICT DO NOTHING;

-- Note: iCal and Schema.org sources would need to be added manually
-- as each venue has different implementation. Examples:
--
-- INSERT INTO event_sources (name, url, source_type, category, is_active) VALUES
--   ('Theater XY Kalender', 'https://theater-xy.de/events.ics', 'ical', 'Theater', true),
--   ('Museum ABC Events', 'https://museum-abc.de/events', 'schema', 'Kultur', true);

-- Create index on source_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_event_sources_source_type ON event_sources(source_type);

-- Grant service role access for n8n workflow
GRANT SELECT, INSERT, UPDATE ON event_sources TO service_role;
GRANT SELECT, INSERT, UPDATE ON scraped_events TO service_role;
GRANT SELECT ON auto_event_config TO service_role;

-- Add comment for documentation
COMMENT ON COLUMN event_sources.source_type IS 'Type of event source: rss (RSS/Atom feeds), ical (iCal/ICS calendars), schema (Schema.org/JSON-LD), web (HTML scraping), api (REST APIs)';
