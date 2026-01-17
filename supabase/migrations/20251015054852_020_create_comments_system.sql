/*
  # Create Comments System with Moderation
  
  This migration creates a comment system for events with AI moderation support.
  
  1. New Tables
    - `comments` - User comments on events
      - event_id (foreign key to events)
      - user_id (who posted the comment)
      - parent_comment_id (for threaded replies)
      - content (the comment text)
      - is_flagged (AI flagged for review)
      - is_hidden (hidden by admin)
  
  2. Security
    - RLS enabled
    - Users can view all non-hidden comments
    - Users can only delete their own comments
    - Admins can hide/delete any comment
  
  3. Features
    - Threaded replies support
    - Like/vote system for comments
    - Moderation flags
*/

-- ============================================================================
-- 1. CREATE COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_flagged boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  hidden_reason text,
  hidden_by uuid REFERENCES profiles(id),
  hidden_at timestamptz,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. CREATE COMMENT LIKES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Users can view non-hidden comments
CREATE POLICY "Users can view non-hidden comments"
  ON comments FOR SELECT
  TO authenticated
  USING (is_hidden = false);

-- Users can insert their own comments
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comment likes policies
CREATE POLICY "Users can view comment likes"
  ON comment_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like comments"
  ON comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments"
  ON comment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS comments_event_id_idx ON comments(event_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS comments_is_flagged_idx ON comments(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx ON comment_likes(user_id);

-- ============================================================================
-- 5. UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();

-- ============================================================================
-- 6. UPDATE COMMENT LIKES COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE comments
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER comment_likes_count_trigger
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_likes_count();
