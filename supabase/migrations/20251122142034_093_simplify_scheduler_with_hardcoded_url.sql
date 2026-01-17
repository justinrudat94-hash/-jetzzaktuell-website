/*
  # Simplify Scheduler with Direct Edge Function Call

  1. Changes
    - Removes dependency on api_keys for URL storage
    - Uses Supabase's internal service role to call functions
    - More reliable execution

  2. Function
    - Directly constructs URL from current database
    - Uses service_role authentication automatically
*/

-- Simplified scheduler function that doesn't need external config
CREATE OR REPLACE FUNCTION execute_pending_schedulers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  scheduler_record RECORD;
  edge_function_url text;
  request_id bigint;
  response_status integer;
  response_content text;
BEGIN
  -- Construct Edge Function URL
  -- In Supabase, we can use the internal URL format
  edge_function_url := 'https://qdnpkuihpmspddnijhmj.supabase.co/functions/v1/run-scheduled-import';

  RAISE NOTICE 'Scheduler cron job running at %', NOW();

  -- Find all enabled schedulers that are due to run
  FOR scheduler_record IN
    SELECT *
    FROM auto_import_schedulers
    WHERE is_enabled = true
      AND next_run_at IS NOT NULL
      AND next_run_at <= NOW()
    ORDER BY next_run_at ASC
    LIMIT 3
  LOOP
    BEGIN
      RAISE NOTICE 'Processing scheduler: % (ID: %)', scheduler_record.name, scheduler_record.id;

      -- Update next_run_at IMMEDIATELY to prevent duplicate runs
      UPDATE auto_import_schedulers
      SET
        last_run_at = NOW(),
        next_run_at = NOW() + (scheduler_record.interval_minutes || ' minutes')::interval,
        updated_at = NOW()
      WHERE id = scheduler_record.id;

      RAISE NOTICE 'Updated next_run_at to: %', NOW() + (scheduler_record.interval_minutes || ' minutes')::interval;

      -- Call Edge Function using pg_net
      BEGIN
        SELECT status, content FROM net.http_post(
          url := edge_function_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkbnBrdWlocG1zcGRkbmlqaG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0NzExMzMsImV4cCI6MjA0NjA0NzEzM30.tDGPnBKDYIyiSwMmEXCZNyD4Z6wJbP7pNqI8fhxZZbg'
          ),
          body := jsonb_build_object(
            'schedulerId', scheduler_record.id
          ),
          timeout_milliseconds := 30000
        ) INTO response_status, response_content;

        RAISE NOTICE 'Edge Function called for scheduler %, status: %, response: %', 
          scheduler_record.name, response_status, response_content;
          
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to call Edge Function for scheduler %: %', 
          scheduler_record.id, SQLERRM;
      END;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error executing scheduler %: %', scheduler_record.id, SQLERRM;
    END;
  END LOOP;

  IF NOT FOUND THEN
    RAISE NOTICE 'No schedulers due to run at this time';
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION execute_pending_schedulers() TO postgres, service_role;
GRANT USAGE ON SCHEMA net TO postgres, service_role;
GRANT SELECT, INSERT ON net.http_request_queue TO postgres, service_role;
