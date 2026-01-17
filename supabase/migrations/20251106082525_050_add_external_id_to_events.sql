/*
  # Add external_id to events table
  
  Adds external_id column to events table for duplicate detection
  
  1. Changes
    - Add external_id column to events table
    - Create index for faster lookups
*/

ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE INDEX IF NOT EXISTS idx_events_external_id ON events(external_id);
