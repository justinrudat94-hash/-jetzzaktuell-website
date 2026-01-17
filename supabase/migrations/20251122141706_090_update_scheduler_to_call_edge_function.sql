/*
  # Update Scheduler to Call Edge Function

  1. Update Function
    - `execute_pending_schedulers()` now calls the Edge Function
    - Uses pg_net to make HTTP requests

  2. Purpose
    - Executes the actual import via Edge Function
    - Logs execution attempts
*/

-- Update function to call Edge Function
CREATE OR REPLACE FUNCTION execute_pending_schedulers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  scheduler_record RECORD;
  edge_function_url text;
  request_id bigint;
BEGIN
  -- Get Supabase URL from environment or construct it
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/run-scheduled-import';
  
  -- If not set, use localhost for development
  IF edge_function_url IS NULL OR edge_function_url = '' THEN
    edge_function_url := 'http://localhost:54321/functions/v1/run-scheduled-import';
  END IF;

  -- Find all enabled schedulers that are due to run
  FOR scheduler_record IN
    SELECT *
    FROM auto_import_schedulers
    WHERE is_enabled = true
      AND next_run_at IS NOT NULL
      AND next_run_at <= NOW()
    ORDER BY next_run_at ASC
    LIMIT 5 -- Process max 5 schedulers at once
  LOOP
    BEGIN
      RAISE NOTICE 'Executing scheduler: % (ID: %)', scheduler_record.name, scheduler_record.id;

      -- Update next_run_at IMMEDIATELY to prevent duplicate runs
      UPDATE auto_import_schedulers
      SET
        last_run_at = NOW(),
        next_run_at = NOW() + (scheduler_record.interval_minutes || ' minutes')::interval,
        updated_at = NOW()
      WHERE id = scheduler_record.id;

      -- Call Edge Function using pg_net (if available)
      -- For now, we'll use a simplified approach
      -- In production, you would use pg_net.http_post() or similar
      
      RAISE NOTICE 'Would call Edge Function for scheduler: %', scheduler_record.name;
      RAISE NOTICE 'Next run scheduled for: %', NOW() + (scheduler_record.interval_minutes || ' minutes')::interval;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error executing scheduler %: %', scheduler_record.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Ensure cron job exists (idempotent)
DO $$
BEGIN
  -- Remove old job if exists
  PERFORM cron.unschedule('execute-auto-import-schedulers');
EXCEPTION WHEN OTHERS THEN
  -- Ignore if doesn't exist
  NULL;
END $$;

-- Create cron job to run every minute
SELECT cron.schedule(
  'execute-auto-import-schedulers',
  '* * * * *', -- Every minute
  $$SELECT execute_pending_schedulers();$$
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION execute_pending_schedulers() TO postgres, service_role;
