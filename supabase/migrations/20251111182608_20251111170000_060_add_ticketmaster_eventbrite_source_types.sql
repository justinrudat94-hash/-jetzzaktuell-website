/*
  # Add Ticketmaster and Eventbrite to event_sources source_type

  1. Changes
    - Drop existing check constraint on event_sources.source_type
    - Add new check constraint including 'ticketmaster' and 'eventbrite'
    - This allows creating event sources for Ticketmaster and Eventbrite APIs

  2. Security
    - No changes to RLS policies
*/

-- Drop existing constraint
ALTER TABLE event_sources 
DROP CONSTRAINT IF EXISTS event_sources_source_type_check;

-- Add new constraint with ticketmaster and eventbrite
ALTER TABLE event_sources
ADD CONSTRAINT event_sources_source_type_check 
CHECK (source_type = ANY (ARRAY['rss'::text, 'ical'::text, 'schema'::text, 'web'::text, 'api'::text, 'ticketmaster'::text, 'eventbrite'::text]));
