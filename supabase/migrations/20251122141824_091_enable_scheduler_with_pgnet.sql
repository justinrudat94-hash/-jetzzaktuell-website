/*
  # Enable Scheduler with pg_net

  1. Update Function
    - Uses pg_net.http_post to call Edge Function
    - Properly executes auto-import schedulers

  2. Changes
    - Calls run-scheduled-import Edge Function
    - Logs all executions
*/

-- Update function to use pg_net for HTTP requests
CREATE OR REPLACE FUNCTION execute_pending_schedulers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  scheduler_record RECORD;
  edge_function_url text;
  supabase_anon_key text;
  request_id bigint;
BEGIN
  -- Get Supabase configuration
  -- You need to set these in your Supabase project settings under "Custom Postgres config"
  supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- Construct Edge Function URL from SUPABASE_URL env
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/run-scheduled-import';

  -- Find all enabled schedulers that are due to run
  FOR scheduler_record IN
    SELECT *
    FROM auto_import_schedulers
    WHERE is_enabled = true
      AND next_run_at IS NOT NULL
      AND next_run_at <= NOW()
    ORDER BY next_run_at ASC
    LIMIT 3 -- Process max 3 schedulers per minute
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

      -- Call Edge Function using pg_net
      IF edge_function_url IS NOT NULL AND edge_function_url != '' THEN
        SELECT net.http_post(
          url := edge_function_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(supabase_anon_key, '')
          ),
          body := jsonb_build_object(
            'schedulerId', scheduler_record.id
          )
        ) INTO request_id;

        RAISE NOTICE 'Edge Function called with request ID: %', request_id;
      ELSE
        RAISE WARNING 'Edge Function URL not configured';
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error executing scheduler %: %', scheduler_record.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION execute_pending_schedulers() TO postgres, service_role;
GRANT USAGE ON SCHEMA net TO postgres, service_role;
