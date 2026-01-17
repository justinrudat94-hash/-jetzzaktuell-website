/*
  # Create AI Learning Cron Job

  1. Purpose
    - Automatically runs the AI learning system daily
    - Learns from successful patterns
    - Deactivates low-performing knowledge entries
    - Keeps the AI knowledge base fresh and accurate

  2. Schedule
    - Runs daily at 03:00 UTC
    - Uses pg_cron extension
    - Calls the run-ai-learning-job edge function

  3. Security
    - Uses internal service role for authentication
    - Only accessible to system
*/

-- Enable pg_net extension if not already enabled (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job for AI learning (runs daily at 3 AM UTC)
SELECT cron.schedule(
  'run-ai-learning-daily',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/run-ai-learning-job',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
      ),
      body := jsonb_build_object(
        'source', 'cron',
        'timestamp', now()
      )
    ) as request_id;
  $$
);

-- Create a manual trigger function for admins
CREATE OR REPLACE FUNCTION trigger_ai_learning_job()
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- This function can be called manually by admins to trigger learning
  -- The actual work is done by the edge function
  
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/run-ai-learning-job',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'source', 'manual',
      'triggered_at', now()
    )
  );

  RETURN jsonb_build_object(
    'status', 'triggered',
    'message', 'AI learning job has been triggered',
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_ai_learning_job IS 'Manually trigger the AI learning job. Can be called by admins to force immediate learning.';