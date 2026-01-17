/*
  # Add External Event Tracking and Affiliate System

  ## Overview
  This migration extends the events table to support external event sources
  (like Ticketmaster, Eventbrite) with proper tracking and affiliate link support.

  ## Changes

  1. New Columns in `events` table
    - `external_source` (text) - Source platform name (e.g., 'ticketmaster', 'eventbrite', 'manual')
    - `external_event_id` (text) - Original event ID from external platform
    - `ticket_url` (text) - Direct ticket purchase URL (can include affiliate parameters)
    - `is_auto_imported` (boolean) - Flag to identify automatically imported events

  2. New Columns in `scraped_events` table
    - `raw_data` (jsonb) - Store complete original event data for reference

  3. Indexes
    - Index on external_source + external_event_id for fast lookups
    - Prevent duplicate imports from same source

  ## Security
  - No RLS changes needed (inherits from existing event policies)
  - External tracking is read-only metadata

  ## Notes
  - ticket_url will contain affiliate links once Ticketmaster partnership is active
  - external_source helps analytics and reporting
  - raw_data in scraped_events preserves original API response
*/

-- Add external tracking fields to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS external_source text,
ADD COLUMN IF NOT EXISTS external_event_id text,
ADD COLUMN IF NOT EXISTS ticket_url text,
ADD COLUMN IF NOT EXISTS is_auto_imported boolean DEFAULT false;

-- Add raw_data to scraped_events for complete API response storage
ALTER TABLE scraped_events
ADD COLUMN IF NOT EXISTS raw_data jsonb;

-- Create index for fast external event lookups
CREATE INDEX IF NOT EXISTS idx_events_external_source
ON events(external_source, external_event_id)
WHERE external_source IS NOT NULL;

-- Create unique constraint to prevent duplicate imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_unique_external
ON events(external_source, external_event_id)
WHERE external_source IS NOT NULL AND external_event_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN events.external_source IS 'Source platform for imported events (ticketmaster, eventbrite, manual, etc.)';
COMMENT ON COLUMN events.external_event_id IS 'Original event ID from external platform';
COMMENT ON COLUMN events.ticket_url IS 'Direct ticket purchase URL with affiliate tracking parameters';
COMMENT ON COLUMN events.is_auto_imported IS 'True if event was automatically imported from external source';
COMMENT ON COLUMN scraped_events.raw_data IS 'Complete original API response data from external platform';
