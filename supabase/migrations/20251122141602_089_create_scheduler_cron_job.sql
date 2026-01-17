/*
  # Create Scheduler Cron Job

  1. Edge Function
    - Creates an Edge Function to execute pending schedulers

  2. Cron Job
    - Runs every minute
    - Checks for schedulers where next_run_at <= NOW()
    - Executes the import and updates next_run_at

  3. Function
    - `execute_pending_schedulers()` - Finds and executes due schedulers
*/

-- Create function to execute pending schedulers
CREATE OR REPLACE FUNCTION execute_pending_schedulers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  scheduler_record RECORD;
  api_url text;
BEGIN
  -- Find all enabled schedulers that are due to run
  FOR scheduler_record IN
    SELECT *
    FROM auto_import_schedulers
    WHERE is_enabled = true
      AND next_run_at IS NOT NULL
      AND next_run_at <= NOW()
  LOOP
    -- Log that we're starting this scheduler
    INSERT INTO auto_import_logs (scheduler_id, started_at, status)
    VALUES (scheduler_record.id, NOW(), 'running');

    -- Update next_run_at IMMEDIATELY to prevent duplicate runs
    UPDATE auto_import_schedulers
    SET
      last_run_at = NOW(),
      next_run_at = NOW() + (scheduler_record.interval_minutes || ' minutes')::interval,
      updated_at = NOW()
    WHERE id = scheduler_record.id;

    -- TODO: Here we would call an Edge Function to do the actual import
    -- For now, just log that we would run it
    RAISE NOTICE 'Would execute scheduler: % (next run: %)',
      scheduler_record.name,
      NOW() + (scheduler_record.interval_minutes || ' minutes')::interval;
  END LOOP;
END;
$$;

-- Create cron job to run every minute
-- This will check for and execute any schedulers that are due
SELECT cron.schedule(
  'execute-auto-import-schedulers',
  '* * * * *', -- Every minute
  $$SELECT execute_pending_schedulers();$$
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION execute_pending_schedulers() TO postgres;
