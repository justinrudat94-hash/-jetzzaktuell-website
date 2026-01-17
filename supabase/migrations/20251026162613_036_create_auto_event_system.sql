/*
  # Auto Event Creation System

  1. New Tables
    - `event_sources`
      - `id` (uuid, primary key)
      - `name` (text) - Source name (e.g., "Eventbrite Munich")
      - `url` (text) - Source URL to scrape
      - `type` (text) - Source type (web, api, rss)
      - `category` (text) - Default category for events
      - `is_active` (boolean) - Whether this source is active
      - `scrape_frequency_hours` (integer) - How often to scrape in hours
      - `last_scraped_at` (timestamptz) - Last successful scrape
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `scraped_events`
      - `id` (uuid, primary key)
      - `source_id` (uuid, foreign key) - References event_sources
      - `external_id` (text) - ID from external source
      - `title` (text)
      - `description` (text)
      - `location` (text)
      - `latitude` (float)
      - `longitude` (float)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `category` (text)
      - `image_url` (text) - Assigned Pexels image
      - `external_url` (text) - Link to original event
      - `status` (text) - pending, approved, rejected, published
      - `event_id` (uuid) - Reference to created event (nullable)
      - `created_at` (timestamptz)
      - `reviewed_at` (timestamptz)
      - `reviewed_by` (uuid)
    
    - `auto_event_config`
      - `id` (uuid, primary key)
      - `is_enabled` (boolean) - Global on/off switch
      - `auto_approve` (boolean) - Auto-publish or require review
      - `min_days_advance` (integer) - Minimum days in advance for events
      - `max_days_advance` (integer) - Maximum days in advance for events
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Admin-only access for configuration
    - Public read access for published events
*/

-- Create event_sources table
CREATE TABLE IF NOT EXISTS event_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'web',
  category text,
  is_active boolean DEFAULT true,
  scrape_frequency_hours integer DEFAULT 24,
  last_scraped_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scraped_events table
CREATE TABLE IF NOT EXISTS scraped_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES event_sources(id) ON DELETE CASCADE,
  external_id text,
  title text NOT NULL,
  description text,
  location text,
  latitude float,
  longitude float,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  category text,
  image_url text,
  external_url text,
  status text DEFAULT 'pending',
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id)
);

-- Create auto_event_config table (single row config)
CREATE TABLE IF NOT EXISTS auto_event_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT false,
  auto_approve boolean DEFAULT false,
  min_days_advance integer DEFAULT 1,
  max_days_advance integer DEFAULT 90,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default config
INSERT INTO auto_event_config (is_enabled, auto_approve, min_days_advance, max_days_advance)
VALUES (false, false, 1, 90)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE event_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_event_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_sources
CREATE POLICY "Admins can manage event sources"
  ON event_sources FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for scraped_events
CREATE POLICY "Admins can view scraped events"
  ON scraped_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage scraped events"
  ON scraped_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for auto_event_config
CREATE POLICY "Admins can view config"
  ON auto_event_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update config"
  ON auto_event_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scraped_events_source_id ON scraped_events(source_id);
CREATE INDEX IF NOT EXISTS idx_scraped_events_status ON scraped_events(status);
CREATE INDEX IF NOT EXISTS idx_scraped_events_start_date ON scraped_events(start_date);
CREATE INDEX IF NOT EXISTS idx_event_sources_active ON event_sources(is_active);

-- Create updated_at trigger for event_sources
CREATE OR REPLACE FUNCTION update_event_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_sources_updated_at
  BEFORE UPDATE ON event_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_event_sources_updated_at();

-- Create updated_at trigger for auto_event_config
CREATE OR REPLACE FUNCTION update_auto_event_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_auto_event_config_updated_at
  BEFORE UPDATE ON auto_event_config
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_event_config_updated_at();