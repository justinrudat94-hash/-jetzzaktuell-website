/*
  # Recurring Issues Tracking System (Fixed)

  1. Purpose
    - Track frequently occurring chat topics
    - Identify patterns in user questions
    - Alert admins to emerging issues
    - Help improve knowledge base

  2. New Features
    - Chat topic extraction and categorization
    - Automated pattern detection
    - Admin dashboard for issue trends
    - Alert system for critical patterns

  3. Tables & Functions
    - New: chat_topic_tracking
    - Function: extract_chat_topics
    - Function: get_recurring_issues
    - Function: get_issue_trends
*/

-- Create chat topic tracking table
CREATE TABLE IF NOT EXISTS chat_topic_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  topic_category text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  was_resolved boolean DEFAULT false,
  resolution_method text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_topic_tracking_category ON chat_topic_tracking(topic_category);
CREATE INDEX IF NOT EXISTS idx_chat_topic_tracking_resolved ON chat_topic_tracking(was_resolved);
CREATE INDEX IF NOT EXISTS idx_chat_topic_tracking_created ON chat_topic_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_topic_tracking_keywords ON chat_topic_tracking USING gin(keywords);

-- Enable RLS
ALTER TABLE chat_topic_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own topic tracking"
  ON chat_topic_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert topic tracking"
  ON chat_topic_tracking FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all topic tracking"
  ON chat_topic_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Function to extract topics from chat messages
CREATE OR REPLACE FUNCTION extract_chat_topics(p_conversation_id uuid)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  v_messages text;
  v_topics text[];
  v_topic text;
BEGIN
  -- Get all user messages from conversation
  SELECT string_agg(message, ' ')
  INTO v_messages
  FROM chat_messages
  WHERE conversation_id = p_conversation_id
  AND sender_type = 'user';

  v_topics := ARRAY[]::text[];

  -- Simple keyword-based topic extraction
  IF v_messages ILIKE '%event%erstell%' OR v_messages ILIKE '%event%mach%' THEN
    v_topics := array_append(v_topics, 'event_creation');
  END IF;

  IF v_messages ILIKE '%ticket%kauf%' OR v_messages ILIKE '%ticket%erweb%' THEN
    v_topics := array_append(v_topics, 'ticket_purchase');
  END IF;

  IF v_messages ILIKE '%ticket%verkauf%' THEN
    v_topics := array_append(v_topics, 'ticket_selling');
  END IF;

  IF v_messages ILIKE '%coins%' OR v_messages ILIKE '%münz%' THEN
    v_topics := array_append(v_topics, 'coins');
  END IF;

  IF v_messages ILIKE '%premium%' OR v_messages ILIKE '%abo%' THEN
    v_topics := array_append(v_topics, 'premium');
  END IF;

  IF v_messages ILIKE '%livestream%' OR v_messages ILIKE '%live%stream%' THEN
    v_topics := array_append(v_topics, 'livestream');
  END IF;

  IF v_messages ILIKE '%zahlung%' OR v_messages ILIKE '%payment%' OR v_messages ILIKE '%bezahl%' THEN
    v_topics := array_append(v_topics, 'payment_issues');
  END IF;

  IF v_messages ILIKE '%fehler%' OR v_messages ILIKE '%bug%' OR v_messages ILIKE '%funktioniert nicht%' THEN
    v_topics := array_append(v_topics, 'technical_issues');
  END IF;

  IF v_messages ILIKE '%account%' OR v_messages ILIKE '%profil%' THEN
    v_topics := array_append(v_topics, 'account_issues');
  END IF;

  IF v_messages ILIKE '%gesperrt%' OR v_messages ILIKE '%ban%' THEN
    v_topics := array_append(v_topics, 'account_suspension');
  END IF;

  -- If no topics found, mark as general
  IF array_length(v_topics, 1) IS NULL THEN
    v_topics := ARRAY['general'];
  END IF;

  RETURN v_topics;
END;
$$;

-- Function to get recurring issues statistics
CREATE OR REPLACE FUNCTION get_recurring_issues(
  p_days integer DEFAULT 7,
  p_min_occurrences integer DEFAULT 3
)
RETURNS TABLE (
  topic_category text,
  occurrence_count bigint,
  resolved_count bigint,
  unresolved_count bigint,
  resolution_rate numeric,
  trend text,
  last_24h_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT
      ctt.topic_category,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE ctt.was_resolved = true) as resolved,
      COUNT(*) FILTER (WHERE ctt.was_resolved = false) as unresolved,
      COUNT(*) FILTER (WHERE ctt.created_at > now() - interval '24 hours') as last_day
    FROM chat_topic_tracking ctt
    WHERE ctt.created_at > now() - (p_days || ' days')::interval
    GROUP BY ctt.topic_category
    HAVING COUNT(*) >= p_min_occurrences
  ),
  previous_period AS (
    SELECT
      ctt.topic_category,
      COUNT(*) as prev_count
    FROM chat_topic_tracking ctt
    WHERE ctt.created_at > now() - (p_days * 2 || ' days')::interval
    AND ctt.created_at <= now() - (p_days || ' days')::interval
    GROUP BY ctt.topic_category
  )
  SELECT
    cp.topic_category,
    cp.total_count,
    cp.resolved,
    cp.unresolved,
    ROUND(
      CASE
        WHEN cp.total_count > 0 THEN (cp.resolved::numeric / cp.total_count::numeric) * 100
        ELSE 0
      END,
      2
    ) as resolution_rate,
    CASE
      WHEN pp.prev_count IS NULL OR pp.prev_count = 0 THEN 'new'
      WHEN cp.total_count > pp.prev_count * 1.5 THEN 'rising'
      WHEN cp.total_count < pp.prev_count * 0.5 THEN 'declining'
      ELSE 'stable'
    END as trend,
    cp.last_day
  FROM current_period cp
  LEFT JOIN previous_period pp ON cp.topic_category = pp.topic_category
  ORDER BY cp.total_count DESC, cp.last_day DESC;
END;
$$;

-- Function to get issue trends over time
CREATE OR REPLACE FUNCTION get_issue_trends(
  p_topic_category text DEFAULT NULL,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  date date,
  topic_category text,
  occurrence_count bigint,
  resolved_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(ctt.created_at) as date,
    ctt.topic_category,
    COUNT(*) as occurrence_count,
    COUNT(*) FILTER (WHERE ctt.was_resolved = true) as resolved_count
  FROM chat_topic_tracking ctt
  WHERE ctt.created_at > now() - (p_days || ' days')::interval
  AND (p_topic_category IS NULL OR ctt.topic_category = p_topic_category)
  GROUP BY DATE(ctt.created_at), ctt.topic_category
  ORDER BY date DESC, occurrence_count DESC;
END;
$$;

-- Trigger to automatically track topics when conversation ends
CREATE OR REPLACE FUNCTION track_conversation_topics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_topics text[];
  v_topic text;
  v_keywords text[];
BEGIN
  -- Only process when conversation is ending
  IF NEW.status != OLD.status AND NEW.status IN ('resolved', 'escalated', 'abandoned') THEN
    -- Extract topics
    v_topics := extract_chat_topics(NEW.id);

    -- Extract keywords from first user message
    SELECT ARRAY(
      SELECT DISTINCT lower(word)
      FROM regexp_split_to_table(message, '\s+') word
      WHERE length(word) > 3
      LIMIT 10
    )
    INTO v_keywords
    FROM chat_messages
    WHERE conversation_id = NEW.id
    AND sender_type = 'user'
    ORDER BY created_at
    LIMIT 1;

    -- Insert topic tracking for each identified topic
    FOREACH v_topic IN ARRAY v_topics
    LOOP
      INSERT INTO chat_topic_tracking (
        conversation_id,
        user_id,
        topic_category,
        keywords,
        was_resolved,
        resolution_method,
        resolved_at
      ) VALUES (
        NEW.id,
        NEW.user_id,
        v_topic,
        COALESCE(v_keywords, ARRAY[]::text[]),
        NEW.resolution_type IN ('ai_resolved', 'escalated'),
        NEW.resolution_type,
        NEW.ended_at
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_track_conversation_topics ON chat_conversations;
CREATE TRIGGER trigger_track_conversation_topics
  AFTER UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION track_conversation_topics();

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION get_chat_dashboard_stats(p_days integer DEFAULT 7)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'total_conversations', (
      SELECT COUNT(*)
      FROM chat_conversations
      WHERE created_at > now() - (p_days || ' days')::interval
    ),
    'active_conversations', (
      SELECT COUNT(*)
      FROM chat_conversations
      WHERE status = 'active'
    ),
    'ai_resolved', (
      SELECT COUNT(*)
      FROM chat_conversations
      WHERE resolution_type = 'ai_resolved'
      AND created_at > now() - (p_days || ' days')::interval
    ),
    'escalated', (
      SELECT COUNT(*)
      FROM chat_conversations
      WHERE resolution_type = 'escalated'
      AND created_at > now() - (p_days || ' days')::interval
    ),
    'abandoned', (
      SELECT COUNT(*)
      FROM chat_conversations
      WHERE resolution_type IN ('user_left', 'timeout')
      AND created_at > now() - (p_days || ' days')::interval
    ),
    'avg_messages_per_conversation', (
      SELECT ROUND(AVG(total_messages)::numeric, 1)
      FROM chat_conversations
      WHERE created_at > now() - (p_days || ' days')::interval
      AND total_messages > 0
    ),
    'avg_ai_attempts', (
      SELECT ROUND(AVG(ai_resolution_attempts)::numeric, 1)
      FROM chat_conversations
      WHERE created_at > now() - (p_days || ' days')::interval
    ),
    'satisfaction_rate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE was_helpful = true)::numeric /
        NULLIF(COUNT(*) FILTER (WHERE was_helpful IS NOT NULL)::numeric, 0) * 100,
        1
      )
      FROM chat_conversations
      WHERE created_at > now() - (p_days || ' days')::interval
    ),
    'top_issues', (
      SELECT json_agg(
        json_build_object(
          'category', topic_category,
          'count', occurrence_count,
          'resolved_rate', resolution_rate
        )
        ORDER BY occurrence_count DESC
      )
      FROM get_recurring_issues(p_days, 2)
      LIMIT 5
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;
