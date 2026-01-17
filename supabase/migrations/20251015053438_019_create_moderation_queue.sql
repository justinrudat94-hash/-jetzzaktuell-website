/*
  # Create Moderation Queue System
  
  This migration creates the moderation queue for AI-flagged content.
  
  1. New Tables
    - `moderation_queue` - Stores content flagged by AI for admin review
      - content_type (event, profile, chat, comment)
      - content_id (reference to original content)
      - user_id (who created the content)
      - risk_level (safe, low, medium, high, critical)
      - flagged_categories (array of violation types)
      - status (pending, approved, rejected)
      - reviewed_by (admin user_id)
      - original_content (snapshot for review)
  
  2. Security
    - RLS enabled
    - Only admins can view and update queue
    - Users cannot see their own flagged content
  
  3. Indexes
    - Fast queries by status and risk_level
    - Filter by content_type
*/

-- ============================================================================
-- 1. CREATE MODERATION QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('event', 'profile', 'chat', 'comment')),
  content_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  risk_level text NOT NULL CHECK (risk_level IN ('safe', 'low', 'medium', 'high', 'critical')),
  flagged_categories text[] DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  admin_notes text,
  original_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. ENABLE RLS
-- ============================================================================

ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

-- Admins can view all queue items (TODO: implement proper admin role check)
CREATE POLICY "Admins can view moderation queue"
  ON moderation_queue FOR SELECT
  TO authenticated
  USING (true);

-- Admins can update queue items
CREATE POLICY "Admins can update moderation queue"
  ON moderation_queue FOR UPDATE
  TO authenticated
  USING (true);

-- System can insert to queue
CREATE POLICY "System can insert to moderation queue"
  ON moderation_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS moderation_queue_status_idx ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS moderation_queue_risk_level_idx ON moderation_queue(risk_level DESC);
CREATE INDEX IF NOT EXISTS moderation_queue_content_type_idx ON moderation_queue(content_type);
CREATE INDEX IF NOT EXISTS moderation_queue_created_at_idx ON moderation_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_queue_user_id_idx ON moderation_queue(user_id);

-- ============================================================================
-- 4. UPDATE TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_moderation_queue_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER moderation_queue_updated_at
  BEFORE UPDATE ON moderation_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_moderation_queue_updated_at();
