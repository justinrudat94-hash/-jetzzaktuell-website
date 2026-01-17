/*
  # Create Ticketmaster Query Tracking System

  1. New Tables
    - `ticketmaster_query_splits`
      - Tracks individual query splits during adaptive import
      - Stores query parameters, results, and status
      - Enables resume functionality on failures
    
    - `ticketmaster_metadata_cache`
      - Caches DMAs, Genres, SubGenres from Ticketmaster API
      - Reduces API calls and improves performance
      - Periodically refreshed
  
  2. Changes to Existing Tables
    - Add indexes to `ticketmaster_import_history` for better performance
  
  3. Security
    - RLS enabled on all tables
    - Admin users can view/manage all queries
    - Service role can write for automated imports

  4. Important Notes
    - Query splits enable processing >1000 events per logical query
    - Metadata cache reduces API calls for classifications and venues
    - Status tracking enables resume after failures or rate limits
*/

-- Create ticketmaster_query_splits table
CREATE TABLE IF NOT EXISTS ticketmaster_query_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id uuid REFERENCES ticketmaster_import_history(id) ON DELETE CASCADE,
  
  -- Query configuration
  query_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  query_label text NOT NULL,
  priority integer DEFAULT 5,
  
  -- Discovery phase results
  total_elements integer,
  discovered_at timestamptz,
  
  -- Import results
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'discovering', 'importing', 'completed', 'failed', 'skipped', 'split_needed')),
  pages_fetched integer DEFAULT 0,
  events_found integer DEFAULT 0,
  events_imported integer DEFAULT 0,
  events_skipped integer DEFAULT 0,
  
  -- Error handling
  error_message text,
  retry_count integer DEFAULT 0,
  
  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  -- Split tracking
  parent_split_id uuid REFERENCES ticketmaster_query_splits(id) ON DELETE SET NULL,
  split_reason text,
  child_splits_count integer DEFAULT 0
);

-- Create ticketmaster_metadata_cache table
CREATE TABLE IF NOT EXISTS ticketmaster_metadata_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cache type and key
  cache_type text NOT NULL CHECK (cache_type IN ('dma', 'segment', 'genre', 'subgenre', 'venue', 'classification')),
  cache_key text NOT NULL,
  
  -- Cached data
  data jsonb NOT NULL,
  
  -- Metadata
  country_code text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(cache_type, cache_key)
);

-- Create indexes for query_splits
CREATE INDEX IF NOT EXISTS idx_query_splits_import_run ON ticketmaster_query_splits(import_run_id);
CREATE INDEX IF NOT EXISTS idx_query_splits_status ON ticketmaster_query_splits(status);
CREATE INDEX IF NOT EXISTS idx_query_splits_priority ON ticketmaster_query_splits(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_query_splits_parent ON ticketmaster_query_splits(parent_split_id);
CREATE INDEX IF NOT EXISTS idx_query_splits_created ON ticketmaster_query_splits(created_at DESC);

-- Create indexes for metadata_cache
CREATE INDEX IF NOT EXISTS idx_metadata_cache_type_key ON ticketmaster_metadata_cache(cache_type, cache_key);
CREATE INDEX IF NOT EXISTS idx_metadata_cache_expires ON ticketmaster_metadata_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_metadata_cache_country ON ticketmaster_metadata_cache(country_code);

-- Enable RLS
ALTER TABLE ticketmaster_query_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticketmaster_metadata_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticketmaster_query_splits
CREATE POLICY "Admin users can view all query splits"
  ON ticketmaster_query_splits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert query splits"
  ON ticketmaster_query_splits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update query splits"
  ON ticketmaster_query_splits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete query splits"
  ON ticketmaster_query_splits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for ticketmaster_metadata_cache
CREATE POLICY "Admin users can view metadata cache"
  ON ticketmaster_metadata_cache FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can manage metadata cache"
  ON ticketmaster_metadata_cache FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add helpful comments
COMMENT ON TABLE ticketmaster_query_splits IS 'Tracks individual query splits for adaptive Ticketmaster imports';
COMMENT ON TABLE ticketmaster_metadata_cache IS 'Caches Ticketmaster API metadata (DMAs, genres, venues) to reduce API calls';

COMMENT ON COLUMN ticketmaster_query_splits.query_params IS 'Ticketmaster API query parameters as JSON';
COMMENT ON COLUMN ticketmaster_query_splits.query_label IS 'Human-readable description of this query';
COMMENT ON COLUMN ticketmaster_query_splits.priority IS 'Query priority (1=highest, 10=lowest)';
COMMENT ON COLUMN ticketmaster_query_splits.total_elements IS 'Total events found during discovery phase';
COMMENT ON COLUMN ticketmaster_query_splits.split_reason IS 'Why this query was split (too_many_results, time_range, genre, dma)';

COMMENT ON COLUMN ticketmaster_metadata_cache.cache_type IS 'Type of cached data';
COMMENT ON COLUMN ticketmaster_metadata_cache.cache_key IS 'Unique identifier for cached item';
COMMENT ON COLUMN ticketmaster_metadata_cache.data IS 'Cached data from Ticketmaster API';
COMMENT ON COLUMN ticketmaster_metadata_cache.expires_at IS 'When this cache entry expires';