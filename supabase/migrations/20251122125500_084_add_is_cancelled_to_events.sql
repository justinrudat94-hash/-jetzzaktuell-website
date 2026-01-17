/*
  # Add is_cancelled field to events table

  1. Changes
    - Add `is_cancelled` (boolean) column to events table
    - Default: false
    - Indexed for performance
    
  2. Important Notes
    - This field is needed for event-cancelled notifications
    - Will be used to trigger notifications to all affected users
*/

-- Add is_cancelled column to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false;

-- Create index for filtering cancelled events
CREATE INDEX IF NOT EXISTS idx_events_is_cancelled 
  ON events(is_cancelled) WHERE is_cancelled = true;

COMMENT ON COLUMN events.is_cancelled IS 'Whether the event has been cancelled';
