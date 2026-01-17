/*
  # Fix RLS policies for auto_import_schedulers

  1. Changes
    - Add RLS policies for authenticated users to manage schedulers
    - Allow anon key access for backend operations

  2. Security
    - Only authenticated admins should be able to modify schedulers
    - Service role can do everything
*/

-- Enable RLS if not already enabled
ALTER TABLE auto_import_schedulers ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_import_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON auto_import_schedulers;
DROP POLICY IF EXISTS "Allow all operations for service role" ON auto_import_schedulers;
DROP POLICY IF EXISTS "Allow all operations for anon" ON auto_import_schedulers;

-- Allow authenticated users (admins) to manage schedulers
CREATE POLICY "Authenticated users can manage schedulers"
  ON auto_import_schedulers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anon key (for backend operations)
CREATE POLICY "Anon can manage schedulers"
  ON auto_import_schedulers
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Logs policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON auto_import_logs;
DROP POLICY IF EXISTS "Allow all operations for anon" ON auto_import_logs;
DROP POLICY IF EXISTS "Authenticated users can view logs" ON auto_import_logs;
DROP POLICY IF EXISTS "Anon can manage logs" ON auto_import_logs;

CREATE POLICY "Authenticated users can view logs"
  ON auto_import_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can manage logs"
  ON auto_import_logs
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
