/*
  # Add Cron Job for Auto-Close Tickets

  1. Zweck
    - Automatisches Schließen von Tickets nach 48h ohne Antwort
    - Läuft alle 6 Stunden
    - Ruft die auto-close-tickets Edge Function auf

  2. Sicherheit
    - Nutzt pg_cron Extension
    - Ruft Edge Function via http
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job for auto-closing tickets
SELECT cron.schedule(
  'auto-close-resolved-tickets',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-close-tickets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
      ),
      body := '{}'::jsonb
    )
  $$
);

-- Tabelle für Cron-Job-Konfiguration falls noch nicht vorhanden
CREATE TABLE IF NOT EXISTS cron_job_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text UNIQUE NOT NULL,
  schedule text NOT NULL,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  run_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cron_job_config ENABLE ROW LEVEL SECURITY;

-- Nur Admins können Cron-Jobs verwalten
CREATE POLICY "Admins can view cron jobs"
  ON cron_job_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can manage cron jobs"
  ON cron_job_config FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Speichere Cron-Job-Konfiguration
INSERT INTO cron_job_config (job_name, schedule, is_active) VALUES
  ('auto-close-resolved-tickets', '0 */6 * * *', true)
ON CONFLICT (job_name) DO UPDATE
SET schedule = EXCLUDED.schedule, updated_at = now();
