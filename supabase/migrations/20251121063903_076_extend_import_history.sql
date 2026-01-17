/*
  # Extend Ticketmaster Import History for Multi-Query Support

  1. Changes
    - Add `mode` column to track import mode (quick, standard, full, adaptive)
    - Add `config` jsonb column to store import configuration
    - Add `queries` jsonb column to store detailed query results
    - Add `is_auto_import` boolean to distinguish manual vs automatic imports
    - Add indexes for better query performance

  2. Security
    - No RLS changes needed (existing policies apply)
*/

-- Add new columns to ticketmaster_import_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticketmaster_import_history' AND column_name = 'mode'
  ) THEN
    ALTER TABLE ticketmaster_import_history ADD COLUMN mode text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticketmaster_import_history' AND column_name = 'config'
  ) THEN
    ALTER TABLE ticketmaster_import_history ADD COLUMN config jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticketmaster_import_history' AND column_name = 'queries'
  ) THEN
    ALTER TABLE ticketmaster_import_history ADD COLUMN queries jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticketmaster_import_history' AND column_name = 'is_auto_import'
  ) THEN
    ALTER TABLE ticketmaster_import_history ADD COLUMN is_auto_import boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_import_history_mode ON ticketmaster_import_history(mode);
CREATE INDEX IF NOT EXISTS idx_import_history_auto ON ticketmaster_import_history(is_auto_import);
CREATE INDEX IF NOT EXISTS idx_import_history_started_desc ON ticketmaster_import_history(started_at DESC);

-- Add helpful comment
COMMENT ON COLUMN ticketmaster_import_history.mode IS 'Import mode: quick, standard, full, or adaptive';
COMMENT ON COLUMN ticketmaster_import_history.config IS 'Import configuration including time periods, categories, cities';
COMMENT ON COLUMN ticketmaster_import_history.queries IS 'Array of individual query results with stats';
COMMENT ON COLUMN ticketmaster_import_history.is_auto_import IS 'Whether this was an automatic scheduled import';
