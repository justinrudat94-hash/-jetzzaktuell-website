/*
  # Add Season Special Field to Events

  1. Changes
    - Add `season_special` column to `events` table to store seasonal holiday categories
    - Column is optional (nullable) to support events without seasonal categorization
    - Values include: Ostern, Pfingsten, Weihnachten, Silvester, Karneval/Fasching, etc.

  2. Purpose
    - Enable filtering and categorization of events by seasonal holidays
    - Allow users to search for holiday-specific events
    - Support seasonal event discovery and planning
*/

-- Add season_special column to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'season_special'
  ) THEN
    ALTER TABLE events ADD COLUMN season_special text;
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_season_special ON events(season_special);