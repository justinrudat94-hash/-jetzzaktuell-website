/*
  # Extend API Keys Table for OpenAI Integration

  1. Changes to api_keys table
    - Add `key_name` field for better identification
    - Add `is_active` field for enabling/disabling keys
    - Add `last_used_at` field for usage tracking
    - Add `metadata` field for additional info (rate limits, quotas, etc.)

  2. New Tables
    - `api_usage_logs`
      - Tracks API calls, tokens used, costs
      - Used for monitoring and billing

  3. Security
    - Allow admins to read API keys (not full key, masked)
    - Service role has full access
    - Create function to mask API keys for admin display

  4. Initial Data
    - Insert OpenAI API keys
*/

-- Add new columns to api_keys table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'key_name'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN key_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'last_used_at'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN last_used_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
END $$;

-- Update existing Ticketmaster key
UPDATE api_keys
SET
  key_name = 'Ticketmaster Discovery API',
  is_active = true,
  metadata = jsonb_build_object(
    'purpose', 'Event aggregation and import',
    'rate_limit', '5000 requests/day'
  )
WHERE service = 'ticketmaster';

-- Insert OpenAI API keys
INSERT INTO api_keys (service, key_name, api_key, is_active, metadata)
VALUES
  (
    'openai',
    'OpenAI Moderation & Chat Support',
    'sk-proj-YOUR_OPENAI_API_KEY_HERE',
    true,
    jsonb_build_object(
      'purpose', 'Content moderation and AI chat support',
      'model', 'gpt-4',
      'features', jsonb_build_array('chat', 'moderation', 'vision')
    )
  )
ON CONFLICT (service)
DO UPDATE SET
  api_key = EXCLUDED.api_key,
  key_name = EXCLUDED.key_name,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Create API usage logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  service text NOT NULL,
  function_name text NOT NULL,
  endpoint text,
  method text DEFAULT 'POST',
  request_tokens integer DEFAULT 0,
  response_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  estimated_cost_usd decimal(10, 6) DEFAULT 0,
  execution_time_ms integer DEFAULT 0,
  status text CHECK (status IN ('success', 'error', 'rate_limited')),
  error_message text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_service ON api_usage_logs(service);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_status ON api_usage_logs(status);

-- Enable RLS
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_usage_logs
CREATE POLICY "Service role can manage API usage logs"
  ON api_usage_logs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Admins can view API usage logs"
  ON api_usage_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to mask API keys for admin display
CREATE OR REPLACE FUNCTION get_masked_api_key(key text)
RETURNS text AS $$
BEGIN
  IF length(key) <= 8 THEN
    RETURN '****';
  END IF;
  RETURN substring(key, 1, 4) || '****' || substring(key, length(key) - 3, 4);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API keys with masking for admins
CREATE OR REPLACE FUNCTION get_api_keys_for_admin()
RETURNS TABLE (
  id uuid,
  service text,
  key_name text,
  masked_key text,
  is_active boolean,
  last_used_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  metadata jsonb
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    ak.id,
    ak.service,
    ak.key_name,
    get_masked_api_key(ak.api_key) as masked_key,
    ak.is_active,
    ak.last_used_at,
    ak.created_at,
    ak.updated_at,
    ak.metadata
  FROM api_keys ak
  ORDER BY ak.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API usage statistics
CREATE OR REPLACE FUNCTION get_api_usage_stats(
  days_back integer DEFAULT 30,
  service_filter text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'total_requests', COUNT(*),
    'successful_requests', COUNT(*) FILTER (WHERE status = 'success'),
    'failed_requests', COUNT(*) FILTER (WHERE status = 'error'),
    'rate_limited_requests', COUNT(*) FILTER (WHERE status = 'rate_limited'),
    'total_tokens', COALESCE(SUM(total_tokens), 0),
    'total_cost_usd', COALESCE(SUM(estimated_cost_usd), 0),
    'avg_execution_time_ms', COALESCE(ROUND(AVG(execution_time_ms)), 0),
    'by_service', (
      SELECT jsonb_object_agg(
        service,
        jsonb_build_object(
          'requests', count,
          'tokens', tokens,
          'cost_usd', cost
        )
      )
      FROM (
        SELECT
          service,
          COUNT(*) as count,
          COALESCE(SUM(total_tokens), 0) as tokens,
          COALESCE(SUM(estimated_cost_usd), 0) as cost
        FROM api_usage_logs
        WHERE created_at >= now() - (days_back || ' days')::interval
          AND (service_filter IS NULL OR service = service_filter)
        GROUP BY service
      ) services
    ),
    'daily_usage', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', day,
          'requests', requests,
          'tokens', tokens,
          'cost_usd', cost
        ) ORDER BY day DESC
      )
      FROM (
        SELECT
          DATE(created_at) as day,
          COUNT(*) as requests,
          COALESCE(SUM(total_tokens), 0) as tokens,
          COALESCE(SUM(estimated_cost_usd), 0) as cost
        FROM api_usage_logs
        WHERE created_at >= now() - (days_back || ' days')::interval
          AND (service_filter IS NULL OR service = service_filter)
        GROUP BY DATE(created_at)
        ORDER BY day DESC
        LIMIT 30
      ) daily
    )
  ) INTO result
  FROM api_usage_logs
  WHERE created_at >= now() - (days_back || ' days')::interval
    AND (service_filter IS NULL OR service = service_filter);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
  p_service text,
  p_function_name text,
  p_endpoint text DEFAULT NULL,
  p_request_tokens integer DEFAULT 0,
  p_response_tokens integer DEFAULT 0,
  p_total_tokens integer DEFAULT 0,
  p_estimated_cost decimal DEFAULT 0,
  p_execution_time_ms integer DEFAULT 0,
  p_status text DEFAULT 'success',
  p_error_message text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
  key_id uuid;
BEGIN
  SELECT id INTO key_id
  FROM api_keys
  WHERE service = p_service AND is_active = true
  LIMIT 1;

  IF key_id IS NOT NULL THEN
    UPDATE api_keys
    SET last_used_at = now()
    WHERE id = key_id;
  END IF;

  INSERT INTO api_usage_logs (
    api_key_id,
    service,
    function_name,
    endpoint,
    request_tokens,
    response_tokens,
    total_tokens,
    estimated_cost_usd,
    execution_time_ms,
    status,
    error_message,
    user_id,
    metadata
  ) VALUES (
    key_id,
    p_service,
    p_function_name,
    p_endpoint,
    p_request_tokens,
    p_response_tokens,
    p_total_tokens,
    p_estimated_cost,
    p_execution_time_ms,
    p_status,
    p_error_message,
    p_user_id,
    p_metadata
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
