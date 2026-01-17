/*
  # Fix Scheduler with Environment Variables

  1. Update Function
    - Gets SUPABASE_URL and SUPABASE_ANON_KEY from database
    - Uses api_keys table to store configuration

  2. Changes
    - Reads config from api_keys or uses hardcoded fallback
    - More reliable execution
*/

-- Create function to get Supabase URL from api_keys
CREATE OR REPLACE FUNCTION get_supabase_config()
RETURNS TABLE(url text, anon_key text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT api_key FROM api_keys WHERE service = 'supabase_url' LIMIT 1),
    (SELECT api_key FROM api_keys WHERE service = 'supabase_anon_key' LIMIT 1);
END;
$$;

-- Update scheduler function with better config handling
CREATE OR REPLACE FUNCTION execute_pending_schedulers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  scheduler_record RECORD;
  edge_function_url text;
  supabase_url text;
  supabase_anon_key text;
  request_id bigint;
  config_record RECORD;
BEGIN
  -- Try to get config from api_keys table
  SELECT * FROM get_supabase_config() INTO config_record;
  supabase_url := config_record.url;
  supabase_anon_key := config_record.anon_key;

  -- If not in api_keys, try environment settings
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := current_setting('app.settings.supabase_url', true);
  END IF;
  
  IF supabase_anon_key IS NULL OR supabase_anon_key = '' THEN
    supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
  END IF;

  -- Construct Edge Function URL
  IF supabase_url IS NOT NULL AND supabase_url != '' THEN
    edge_function_url := supabase_url || '/functions/v1/run-scheduled-import';
  ELSE
    RAISE WARNING 'Supabase URL not configured. Cannot execute schedulers.';
    RETURN;
  END IF;

  RAISE NOTICE 'Using Edge Function URL: %', edge_function_url;

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
      RAISE NOTICE 'Executing scheduler: % (ID: %)', scheduler_record.name, scheduler_record.id;

      -- Update next_run_at IMMEDIATELY
      UPDATE auto_import_schedulers
      SET
        last_run_at = NOW(),
        next_run_at = NOW() + (scheduler_record.interval_minutes || ' minutes')::interval,
        updated_at = NOW()
      WHERE id = scheduler_record.id;

      -- Call Edge Function using pg_net
      BEGIN
        SELECT net.http_post(
          url := edge_function_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(supabase_anon_key, '')
          ),
          body := jsonb_build_object(
            'schedulerId', scheduler_record.id
          ),
          timeout_milliseconds := 30000
        ) INTO request_id;

        RAISE NOTICE 'Edge Function called for scheduler % with request ID: %', 
          scheduler_record.name, request_id;
          
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to call Edge Function for scheduler %: %', 
          scheduler_record.id, SQLERRM;
      END;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error executing scheduler %: %', scheduler_record.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION execute_pending_schedulers() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION get_supabase_config() TO postgres, service_role;
GRANT USAGE ON SCHEMA net TO postgres, service_role;
