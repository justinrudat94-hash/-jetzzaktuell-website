/*
  # Create AI Chat Support System

  1. New Tables
    - `chat_conversations`
      - Stores chat sessions between users and AI
      - Tracks status (active, resolved, escalated)
      - Links to tickets if escalated
      - Tracks user satisfaction
    
    - `chat_messages`
      - Individual messages in conversations
      - Sender type (user or ai)
      - AI confidence scores
      - Links to related FAQ items
    
    - `chat_knowledge_base`
      - AI training data from various sources
      - Question patterns and answer templates
      - Success rate tracking
      - Automatic learning from resolved tickets

  2. Security
    - Enable RLS on all tables
    - Users can only access their own conversations
    - Admins can view all conversations for insights
    - Knowledge base is accessible to system for AI responses
*/

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated', 'abandoned')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  escalated_to_ticket_id uuid REFERENCES support_tickets(id) ON DELETE SET NULL,
  satisfaction_rating integer CHECK (satisfaction_rating BETWEEN 1 AND 5),
  was_helpful boolean,
  resolution_type text CHECK (resolution_type IN ('ai_resolved', 'escalated', 'user_left', 'timeout')),
  total_messages integer DEFAULT 0,
  ai_resolution_attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'ai', 'system')),
  message text NOT NULL,
  ai_confidence_score decimal(3,2) CHECK (ai_confidence_score BETWEEN 0 AND 1),
  related_faq_id uuid REFERENCES faq_items(id) ON DELETE SET NULL,
  was_helpful boolean,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create chat_knowledge_base table
CREATE TABLE IF NOT EXISTS chat_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_pattern text NOT NULL,
  answer_template text NOT NULL,
  category text NOT NULL,
  keywords text[] DEFAULT '{}',
  usage_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  success_rate decimal(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN usage_count > 0 THEN (success_count::decimal / usage_count::decimal * 100)
      ELSE 0 
    END
  ) STORED,
  source text NOT NULL CHECK (source IN ('faq', 'ticket_resolution', 'manual', 'chat_learning')),
  source_id uuid,
  confidence_threshold decimal(3,2) DEFAULT 0.70,
  is_active boolean DEFAULT true,
  language text DEFAULT 'de',
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  last_used_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created ON chat_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_knowledge_category ON chat_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_chat_knowledge_success_rate ON chat_knowledge_base(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_chat_knowledge_keywords ON chat_knowledge_base USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_chat_knowledge_active ON chat_knowledge_base(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view their own conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can create their own conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own conversations"
  ON chat_conversations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users and system can insert messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their message feedback"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

-- RLS Policies for chat_knowledge_base
CREATE POLICY "Authenticated users can view active knowledge"
  ON chat_knowledge_base FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all knowledge"
  ON chat_knowledge_base FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage knowledge base"
  ON chat_knowledge_base FOR ALL
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

-- Function to update conversation stats
CREATE OR REPLACE FUNCTION update_chat_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chat_conversations
    SET total_messages = total_messages + 1,
        updated_at = now()
    WHERE id = NEW.conversation_id;
    
    IF NEW.sender_type = 'ai' THEN
      UPDATE chat_conversations
      SET ai_resolution_attempts = ai_resolution_attempts + 1
      WHERE id = NEW.conversation_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for conversation stats
CREATE TRIGGER update_chat_stats_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_conversation_stats();

-- Function to update knowledge base usage
CREATE OR REPLACE FUNCTION track_knowledge_usage(
  kb_id uuid,
  was_successful boolean
)
RETURNS void AS $$
BEGIN
  UPDATE chat_knowledge_base
  SET usage_count = usage_count + 1,
      success_count = CASE WHEN was_successful THEN success_count + 1 ELSE success_count END,
      failure_count = CASE WHEN NOT was_successful THEN failure_count + 1 ELSE failure_count END,
      last_used_at = now()
  WHERE id = kb_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create knowledge from resolved ticket
CREATE OR REPLACE FUNCTION learn_from_ticket(
  ticket_id uuid
)
RETURNS void AS $$
DECLARE
  ticket_record RECORD;
BEGIN
  SELECT * INTO ticket_record
  FROM support_tickets
  WHERE id = ticket_id
  AND status = 'closed'
  AND resolution IS NOT NULL;
  
  IF FOUND THEN
    INSERT INTO chat_knowledge_base (
      question_pattern,
      answer_template,
      category,
      source,
      source_id,
      language
    ) VALUES (
      ticket_record.subject,
      ticket_record.resolution,
      ticket_record.category,
      'ticket_resolution',
      ticket_id,
      'de'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get chat analytics
CREATE OR REPLACE FUNCTION get_chat_analytics(
  days_back integer DEFAULT 7
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_conversations', COUNT(*),
    'active_conversations', COUNT(*) FILTER (WHERE status = 'active'),
    'resolved_conversations', COUNT(*) FILTER (WHERE status = 'resolved'),
    'escalated_conversations', COUNT(*) FILTER (WHERE status = 'escalated'),
    'success_rate', ROUND(
      COUNT(*) FILTER (WHERE status = 'resolved')::decimal / 
      NULLIF(COUNT(*), 0) * 100, 2
    ),
    'avg_satisfaction', ROUND(AVG(satisfaction_rating), 2),
    'avg_messages_per_conversation', ROUND(AVG(total_messages), 2)
  ) INTO result
  FROM chat_conversations
  WHERE created_at >= now() - (days_back || ' days')::interval;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
