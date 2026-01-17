/*
  # Add config column to event_sources

  1. Changes
    - Add `config` column to `event_sources` table
      - Type: JSONB (flexible configuration storage)
      - Default: empty JSON object
      - Nullable: allows null values for backwards compatibility

  2. Purpose
    - Store source-specific configuration (API keys, search parameters, etc.)
    - Used by Eventbrite integration to store search settings
*/

ALTER TABLE event_sources 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN event_sources.config IS 'Source-specific configuration (API keys, search parameters, etc.)';
