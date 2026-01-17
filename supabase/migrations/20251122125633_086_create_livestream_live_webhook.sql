/*
  # Create livestream-live notification webhook trigger

  1. Trigger Function Created
    - `notify_livestream_live_webhook()` - Calls Edge Function when livestream goes live
    
  2. Logic
    - Triggers on INSERT or UPDATE of live_streams table
    - Only when status = 'live'
    - Calls notify-livestream-live Edge Function via pg_net extension
    
  3. Important Notes
    - Uses supabase_functions.http_request for async webhook
    - Edge Function handles all notification logic
    - Non-blocking for database performance
    
  4. Security
    - Uses service role key for webhook authentication
    - SECURITY DEFINER function
*/

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger Function: Call Edge Function when livestream goes live
CREATE OR REPLACE FUNCTION notify_livestream_live_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  function_url text;
  service_role_key text;
  request_id bigint;
BEGIN
  -- Only trigger if livestream just went live
  IF NEW.status = 'live' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.status IS NULL OR OLD.status != 'live'))) THEN
    
    -- Get Supabase URL and service role key from environment
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-livestream-live';
    service_role_key := current_setting('app.settings.supabase_service_role_key', true);
    
    -- If settings not available, construct from default patterns
    IF function_url IS NULL OR function_url = '' THEN
      function_url := 'https://' || current_setting('request.jwt.claims', true)::json->>'iss' || '/functions/v1/notify-livestream-live';
    END IF;
    
    -- Make async HTTP request to Edge Function
    SELECT INTO request_id net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', row_to_json(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
      )
    );
    
    RAISE NOTICE 'Livestream live webhook triggered: request_id = %', request_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on live_streams table
DROP TRIGGER IF EXISTS on_livestream_live_webhook ON live_streams;
CREATE TRIGGER on_livestream_live_webhook
  AFTER INSERT OR UPDATE ON live_streams
  FOR EACH ROW
  WHEN (NEW.status = 'live')
  EXECUTE FUNCTION notify_livestream_live_webhook();

COMMENT ON FUNCTION notify_livestream_live_webhook IS 'Calls Edge Function to notify users when livestream goes live';
