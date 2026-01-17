/*
  # Create live_streams table

  1. New Tables
    - `live_streams`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key to events)
      - `stream_key` (text, unique)
      - `stream_url` (text)
      - `status` (text) - 'waiting', 'live', 'ended'
      - `viewer_count` (integer)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `live_streams` table
    - Add policies for public viewing of live streams
    - Add policies for event creators to manage their streams
*/

CREATE TABLE IF NOT EXISTS live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  stream_key text UNIQUE NOT NULL,
  stream_url text,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'live', 'ended')),
  viewer_count integer DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live streams"
  ON live_streams FOR SELECT
  TO public
  USING (status = 'live');

CREATE POLICY "Event creators can manage their streams"
  ON live_streams FOR ALL
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE creator_id = auth.uid()
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT id FROM events WHERE creator_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_live_streams_event_id ON live_streams(event_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_stream_key ON live_streams(stream_key);

COMMENT ON TABLE live_streams IS 'Live streaming sessions for events';
