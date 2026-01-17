/*
  # Create Auto-Import Scheduler System

  1. New Tables
    - `auto_import_schedulers`
      - `id` (uuid, primary key)
      - `name` (text) - Scheduler name (e.g., "Leipzig Auto-Import")
      - `source_type` (text) - 'ticketmaster' or 'eventbrite'
      - `is_enabled` (boolean) - Enable/disable scheduler
      - `config` (jsonb) - Scheduler configuration (city, radius, etc.)
      - `interval_minutes` (integer) - How often to run (default 60)
      - `last_run_at` (timestamptz) - Last execution time
      - `next_run_at` (timestamptz) - Next scheduled execution
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `auto_import_logs`
      - `id` (uuid, primary key)
      - `scheduler_id` (uuid, foreign key)
      - `started_at` (timestamptz)
      - `finished_at` (timestamptz)
      - `status` (text) - 'running', 'success', 'failed'
      - `events_found` (integer)
      - `events_imported` (integer)
      - `events_skipped` (integer)
      - `events_failed` (integer)
      - `error_message` (text)
      - `details` (jsonb)

  2. Security
    - Enable RLS on both tables
    - Only admins can manage schedulers
    - Authenticated users can view logs

  3. Functions
    - `update_scheduler_next_run()` - Trigger to calculate next run time
*/

-- Create auto_import_schedulers table
CREATE TABLE IF NOT EXISTS auto_import_schedulers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('ticketmaster', 'eventbrite')),
  is_enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  interval_minutes integer NOT NULL DEFAULT 60,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create auto_import_logs table
CREATE TABLE IF NOT EXISTS auto_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduler_id uuid NOT NULL REFERENCES auto_import_schedulers(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  events_found integer DEFAULT 0,
  events_imported integer DEFAULT 0,
  events_skipped integer DEFAULT 0,
  events_failed integer DEFAULT 0,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE auto_import_schedulers ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_import_logs ENABLE ROW LEVEL SECURITY;

-- Policies for auto_import_schedulers
CREATE POLICY "Admins can manage schedulers"
  ON auto_import_schedulers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can view schedulers"
  ON auto_import_schedulers
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for auto_import_logs
CREATE POLICY "Admins can manage logs"
  ON auto_import_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can view logs"
  ON auto_import_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to update next_run_at when scheduler is enabled
CREATE OR REPLACE FUNCTION update_scheduler_next_run()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_enabled = true AND (OLD.is_enabled = false OR OLD.is_enabled IS NULL) THEN
    NEW.next_run_at = now() + (NEW.interval_minutes || ' minutes')::interval;
  ELSIF NEW.is_enabled = false THEN
    NEW.next_run_at = NULL;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update next_run_at
DROP TRIGGER IF EXISTS trigger_update_scheduler_next_run ON auto_import_schedulers;
CREATE TRIGGER trigger_update_scheduler_next_run
  BEFORE INSERT OR UPDATE ON auto_import_schedulers
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduler_next_run();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_schedulers_enabled ON auto_import_schedulers(is_enabled);
CREATE INDEX IF NOT EXISTS idx_schedulers_next_run ON auto_import_schedulers(next_run_at) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_logs_scheduler ON auto_import_logs(scheduler_id);
CREATE INDEX IF NOT EXISTS idx_logs_started ON auto_import_logs(started_at DESC);

-- Insert default Leipzig scheduler
INSERT INTO auto_import_schedulers (name, source_type, is_enabled, config, interval_minutes)
VALUES (
  'Leipzig Ticketmaster Auto-Import',
  'ticketmaster',
  false,
  '{"city": "Leipzig", "radius": "50", "countryCode": "DE"}'::jsonb,
  60
)
ON CONFLICT DO NOTHING;
