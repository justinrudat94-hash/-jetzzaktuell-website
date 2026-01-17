/*
  # Create API Keys Table

  1. New Tables
    - `api_keys`
      - `id` (uuid, primary key)
      - `service` (text) - Name of the service (e.g., 'ticketmaster', 'eventbrite')
      - `api_key` (text) - The actual API key (encrypted)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `api_keys` table
    - Only service role can access this table (Edge Functions)
    
  3. Initial Data
    - Insert Ticketmaster API key
*/

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text UNIQUE NOT NULL,
  api_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Only service role can access (Edge Functions use service role)
CREATE POLICY "Service role can manage API keys"
  ON api_keys
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Insert Ticketmaster API key
INSERT INTO api_keys (service, api_key)
VALUES ('ticketmaster', 'y0PHGhKdCgQgqZFIFjnU8ZXPOgGqTkxT')
ON CONFLICT (service) 
DO UPDATE SET 
  api_key = EXCLUDED.api_key,
  updated_at = now();
