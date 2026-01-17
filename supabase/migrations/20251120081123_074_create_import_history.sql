/*
  # Create Ticketmaster Import History

  1. New Table
    - `ticketmaster_import_history`
      - `id` (uuid, primary key)
      - `started_at` (timestamptz) - When the import started
      - `completed_at` (timestamptz) - When the import finished
      - `duration_seconds` (integer) - How long it took
      - `total_found` (integer) - Total events found from API
      - `imported_count` (integer) - Successfully imported events
      - `skipped_count` (integer) - Skipped duplicate events
      - `error_count` (integer) - Events that failed to import
      - `status` (text) - 'running', 'completed', 'failed'
      - `error_message` (text) - Error details if failed
      - `pages_fetched` (integer) - Number of API pages fetched
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Only admins can view import history
*/

CREATE TABLE IF NOT EXISTS ticketmaster_import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  duration_seconds integer,
  total_found integer DEFAULT 0,
  imported_count integer DEFAULT 0,
  skipped_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error_message text,
  pages_fetched integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ticketmaster_import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view import history"
  ON ticketmaster_import_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Service role can manage import history"
  ON ticketmaster_import_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_import_history_started_at
  ON ticketmaster_import_history(started_at DESC);
