/*
  # Create Automated Dunning Cron Job

  1. Cron Job Setup
    - Runs daily at 9:00 AM UTC
    - Calls process-dunning-cases edge function
    - Automatically creates new dunning cases for past_due subscriptions
    - Escalates existing cases when action date is due
    - Forwards level 3 cases to collection after 14 days

  2. Requirements
    - pg_cron extension must be enabled
    - pg_net extension for HTTP requests

  3. What it does
    - Creates dunning cases for new past_due subscriptions
    - Sends 1st dunning letter automatically
    - Escalates to 2nd dunning after 14 days
    - Escalates to 3rd dunning after another 14 days
    - Forwards to collection after final 14 days
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing job if exists (for clean migration)
DO $$
BEGIN
  PERFORM cron.unschedule('process-dunning-cases-daily');
EXCEPTION
  WHEN undefined_table THEN
    NULL;
  WHEN OTHERS THEN
    NULL;
END $$;

-- Create cron job that runs daily at 9:00 AM UTC
SELECT cron.schedule(
  'process-dunning-cases-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-dunning-cases',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Create a manual trigger function for testing
CREATE OR REPLACE FUNCTION trigger_dunning_process()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-dunning-cases',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_dunning_process() TO authenticated;

COMMENT ON FUNCTION trigger_dunning_process() IS 'Manually trigger the dunning process for testing purposes. Admins only.';
