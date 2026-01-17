/*
  # Create Search History System

  1. New Tables
    - `search_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - User who performed the search
      - `search_term` (text) - The search query
      - `search_type` (text) - Type of search: 'event', 'place', 'category', 'season'
      - `search_count` (integer) - Number of times this term was searched by user
      - `last_searched_at` (timestamptz) - When this term was last searched
      - `created_at` (timestamptz) - When first searched

  2. Security
    - Enable RLS on `search_history` table
    - Add policies for authenticated users to manage their own search history
    - Users can only see and modify their own searches

  3. Indexes
    - Index on `user_id` for fast user queries
    - Index on `last_searched_at` for recent searches
    - Composite index on `user_id` and `search_count` for popular searches

  4. Notes
    - Supports personalized search suggestions
    - Tracks search frequency for better recommendations
    - GDPR compliant - users can delete their history
*/

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_term TEXT NOT NULL,
  search_type TEXT NOT NULL CHECK (search_type IN ('event', 'place', 'category', 'season')),
  search_count INTEGER DEFAULT 1,
  last_searched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_last_searched ON search_history(user_id, last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_count ON search_history(user_id, search_count DESC);

-- Enable RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own search history
CREATE POLICY "Users can view own search history"
  ON search_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own searches
CREATE POLICY "Users can insert own searches"
  ON search_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own search history
CREATE POLICY "Users can update own search history"
  ON search_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own search history
CREATE POLICY "Users can delete own search history"
  ON search_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to clean up old search history (keep only 50 most recent per user)
CREATE OR REPLACE FUNCTION cleanup_old_search_history()
RETURNS void AS $$
BEGIN
  DELETE FROM search_history
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY last_searched_at DESC) as rn
      FROM search_history
    ) ranked
    WHERE rn > 50
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;