/*
  # Create AI Feedback Learning System

  This migration creates a self-learning AI system that improves based on user feedback.

  ## 1. New Tables

  ### `chat_feedback_details`
  - Stores detailed feedback from users when an answer wasn't helpful
  - Tracks what was wrong and what the correct answer should be
  - Used for improving AI responses over time

  ### `chat_learning_queue`
  - Queue of potential knowledge entries to be reviewed
  - Automatically populated from successful conversations
  - Admins can approve/reject entries

  ### `chat_knowledge_history`
  - Version history of knowledge base entries
  - Tracks changes and improvements over time
  - Allows rollback if needed

  ### `chat_recurring_questions`
  - Tracks frequently asked questions that don't have knowledge entries
  - Automatically suggests new entries to create
  - Priority-based on frequency

  ## 2. Enhanced Functions

  ### Learning Pipeline
  - `handle_negative_feedback()` - Triggered when user marks answer as not helpful
  - `generate_improved_response()` - Creates better answer using feedback context
  - `create_learning_from_feedback()` - Converts successful feedback into knowledge
  - `auto_learn_from_success_pattern()` - Automatically learns from repeated success
  - `deactivate_low_performing_knowledge()` - Removes bad entries

  ## 3. Security
  - RLS enabled on all tables
  - Users can only access their own feedback
  - Admins can manage learning queue
  - System functions use SECURITY DEFINER for automation
*/

-- =====================================================
-- TABLE: chat_feedback_details
-- Detailed feedback for improving AI responses
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_feedback_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Original context
  original_question text NOT NULL,
  original_answer text NOT NULL,
  related_knowledge_id uuid REFERENCES chat_knowledge_base(id) ON DELETE SET NULL,

  -- Feedback details
  feedback_type text NOT NULL CHECK (feedback_type IN ('incorrect', 'incomplete', 'unclear', 'outdated', 'other')),
  feedback_text text,
  correct_answer text,
  missing_information text,

  -- Retry information
  retry_attempted boolean DEFAULT false,
  improved_answer text,
  improved_answer_helpful boolean,
  improved_answer_message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,

  -- Learning status
  learning_status text DEFAULT 'pending' CHECK (learning_status IN ('pending', 'learned', 'reviewed', 'rejected', 'auto_learned')),
  learned_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: chat_learning_queue
-- Queue of knowledge entries waiting for review/activation
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_learning_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source information
  source_type text NOT NULL CHECK (source_type IN ('feedback', 'conversation', 'pattern', 'ticket', 'manual')),
  source_id uuid,

  -- Knowledge content
  question_pattern text NOT NULL,
  answer_template text NOT NULL,
  category text NOT NULL,
  keywords text[] DEFAULT '{}',
  language text DEFAULT 'de',

  -- Confidence metrics
  confidence_score decimal(3,2) DEFAULT 0.70,
  success_count integer DEFAULT 0,
  usage_count integer DEFAULT 0,

  -- Review status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  priority integer DEFAULT 0,

  -- Review information
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,

  -- If approved, link to created knowledge entry
  knowledge_entry_id uuid REFERENCES chat_knowledge_base(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: chat_knowledge_history
-- Version history of knowledge base entries
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_knowledge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id uuid REFERENCES chat_knowledge_base(id) ON DELETE CASCADE NOT NULL,

  -- Version information
  version integer NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('created', 'updated', 'deactivated', 'reactivated', 'improved')),

  -- Snapshot of the entry
  question_pattern text NOT NULL,
  answer_template text NOT NULL,
  category text NOT NULL,
  keywords text[],
  confidence_threshold decimal(3,2),
  is_active boolean,

  -- Metrics at this version
  usage_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  success_rate decimal(5,2),

  -- Change information
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason text,

  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: chat_recurring_questions
-- Tracks frequently asked questions for learning suggestions
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_recurring_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Question information
  question_normalized text NOT NULL UNIQUE,
  question_examples text[] DEFAULT '{}',
  category text,
  keywords text[] DEFAULT '{}',

  -- Frequency tracking
  ask_count integer DEFAULT 1,
  first_asked_at timestamptz DEFAULT now(),
  last_asked_at timestamptz DEFAULT now(),

  -- Response tracking
  successful_gpt_responses text[] DEFAULT '{}',
  avg_confidence_score decimal(3,2),

  -- Learning suggestion
  suggested_for_learning boolean DEFAULT false,
  learning_priority integer DEFAULT 0,
  has_knowledge_entry boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_feedback_details_message ON chat_feedback_details(message_id);
CREATE INDEX IF NOT EXISTS idx_feedback_details_conversation ON chat_feedback_details(conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_details_user ON chat_feedback_details(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_details_status ON chat_feedback_details(learning_status);
CREATE INDEX IF NOT EXISTS idx_feedback_details_created ON chat_feedback_details(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_queue_status ON chat_learning_queue(status);
CREATE INDEX IF NOT EXISTS idx_learning_queue_priority ON chat_learning_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_learning_queue_source ON chat_learning_queue(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_learning_queue_created ON chat_learning_queue(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_history_knowledge ON chat_knowledge_history(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_history_version ON chat_knowledge_history(knowledge_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_history_created ON chat_knowledge_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recurring_questions_normalized ON chat_recurring_questions(question_normalized);
CREATE INDEX IF NOT EXISTS idx_recurring_questions_count ON chat_recurring_questions(ask_count DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_questions_suggested ON chat_recurring_questions(suggested_for_learning) WHERE suggested_for_learning = true;
CREATE INDEX IF NOT EXISTS idx_recurring_questions_priority ON chat_recurring_questions(learning_priority DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE chat_feedback_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_learning_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_knowledge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_recurring_questions ENABLE ROW LEVEL SECURITY;

-- chat_feedback_details policies
CREATE POLICY "Users can view their own feedback"
  ON chat_feedback_details FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
  ON chat_feedback_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can create their own feedback"
  ON chat_feedback_details FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own feedback"
  ON chat_feedback_details FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- chat_learning_queue policies
CREATE POLICY "Admins can view learning queue"
  ON chat_learning_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage learning queue"
  ON chat_learning_queue FOR ALL
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

-- chat_knowledge_history policies
CREATE POLICY "Admins can view knowledge history"
  ON chat_knowledge_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- chat_recurring_questions policies
CREATE POLICY "Admins can view recurring questions"
  ON chat_recurring_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage recurring questions"
  ON chat_recurring_questions FOR ALL
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

-- =====================================================
-- FUNCTION: handle_negative_feedback
-- Called when user marks an answer as not helpful
-- Triggers the improvement and learning process
-- =====================================================
CREATE OR REPLACE FUNCTION handle_negative_feedback(
  p_message_id uuid,
  p_feedback_type text,
  p_feedback_text text DEFAULT NULL,
  p_correct_answer text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_message RECORD;
  v_conversation_id uuid;
  v_user_id uuid;
  v_feedback_id uuid;
  v_knowledge_id uuid;
BEGIN
  -- Get message details
  SELECT
    cm.*,
    cc.user_id,
    cc.id as conv_id
  INTO v_message
  FROM chat_messages cm
  JOIN chat_conversations cc ON cc.id = cm.conversation_id
  WHERE cm.id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  v_conversation_id := v_message.conv_id;
  v_user_id := v_message.user_id;
  v_knowledge_id := v_message.related_faq_id;

  -- Get the user's question (previous message)
  DECLARE
    v_user_question text;
  BEGIN
    SELECT message INTO v_user_question
    FROM chat_messages
    WHERE conversation_id = v_conversation_id
    AND sender_type = 'user'
    AND created_at < v_message.created_at
    ORDER BY created_at DESC
    LIMIT 1;
  END;

  -- Create feedback detail entry
  INSERT INTO chat_feedback_details (
    message_id,
    conversation_id,
    user_id,
    original_question,
    original_answer,
    related_knowledge_id,
    feedback_type,
    feedback_text,
    correct_answer
  ) VALUES (
    p_message_id,
    v_conversation_id,
    v_user_id,
    v_user_question,
    v_message.message,
    v_knowledge_id,
    p_feedback_type,
    p_feedback_text,
    p_correct_answer
  )
  RETURNING id INTO v_feedback_id;

  -- If this was from knowledge base, track the failure
  IF v_knowledge_id IS NOT NULL THEN
    UPDATE chat_knowledge_base
    SET failure_count = failure_count + 1,
        last_updated = now()
    WHERE id = v_knowledge_id;
  END IF;

  RETURN v_feedback_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: create_learning_from_feedback
-- Converts successful feedback into knowledge entry
-- =====================================================
CREATE OR REPLACE FUNCTION create_learning_from_feedback(
  p_feedback_id uuid,
  p_auto_approve boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
  v_feedback RECORD;
  v_queue_id uuid;
  v_knowledge_id uuid;
  v_keywords text[];
BEGIN
  -- Get feedback details
  SELECT * INTO v_feedback
  FROM chat_feedback_details
  WHERE id = p_feedback_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feedback not found';
  END IF;

  -- Extract keywords from question
  SELECT array_agg(DISTINCT word)
  INTO v_keywords
  FROM unnest(string_to_array(lower(v_feedback.original_question), ' ')) AS word
  WHERE length(word) > 3;

  -- Determine answer to use
  DECLARE
    v_answer text;
  BEGIN
    v_answer := COALESCE(
      v_feedback.improved_answer,
      v_feedback.correct_answer,
      v_feedback.original_answer
    );
  END;

  -- Add to learning queue
  INSERT INTO chat_learning_queue (
    source_type,
    source_id,
    question_pattern,
    answer_template,
    category,
    keywords,
    status,
    confidence_score,
    success_count,
    usage_count
  ) VALUES (
    'feedback',
    p_feedback_id,
    v_feedback.original_question,
    v_answer,
    'general',
    v_keywords,
    CASE WHEN p_auto_approve THEN 'auto_approved' ELSE 'pending' END,
    0.75,
    CASE WHEN v_feedback.improved_answer_helpful THEN 1 ELSE 0 END,
    1
  )
  RETURNING id INTO v_queue_id;

  -- If auto-approve, create knowledge entry immediately
  IF p_auto_approve THEN
    INSERT INTO chat_knowledge_base (
      question_pattern,
      answer_template,
      category,
      keywords,
      source,
      source_id,
      confidence_threshold,
      is_active
    ) VALUES (
      v_feedback.original_question,
      v_answer,
      'general',
      v_keywords,
      'chat_learning',
      p_feedback_id,
      0.75,
      true
    )
    RETURNING id INTO v_knowledge_id;

    -- Update queue with knowledge entry link
    UPDATE chat_learning_queue
    SET knowledge_entry_id = v_knowledge_id
    WHERE id = v_queue_id;

    -- Mark feedback as learned
    UPDATE chat_feedback_details
    SET learning_status = 'auto_learned',
        learned_at = now()
    WHERE id = p_feedback_id;
  END IF;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: track_recurring_question
-- Tracks questions for pattern analysis
-- =====================================================
CREATE OR REPLACE FUNCTION track_recurring_question(
  p_question text,
  p_category text DEFAULT 'general',
  p_was_successful boolean DEFAULT false,
  p_gpt_response text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_normalized text;
  v_keywords text[];
BEGIN
  -- Normalize question (lowercase, trim)
  v_normalized := lower(trim(p_question));

  -- Extract keywords
  SELECT array_agg(DISTINCT word)
  INTO v_keywords
  FROM unnest(string_to_array(v_normalized, ' ')) AS word
  WHERE length(word) > 3;

  -- Insert or update recurring question
  INSERT INTO chat_recurring_questions (
    question_normalized,
    question_examples,
    category,
    keywords,
    ask_count,
    successful_gpt_responses,
    last_asked_at
  ) VALUES (
    v_normalized,
    ARRAY[p_question],
    p_category,
    v_keywords,
    1,
    CASE WHEN p_was_successful AND p_gpt_response IS NOT NULL
         THEN ARRAY[p_gpt_response]
         ELSE ARRAY[]::text[] END,
    now()
  )
  ON CONFLICT (question_normalized) DO UPDATE SET
    ask_count = chat_recurring_questions.ask_count + 1,
    question_examples = array_append(chat_recurring_questions.question_examples, p_question),
    successful_gpt_responses = CASE
      WHEN p_was_successful AND p_gpt_response IS NOT NULL
      THEN array_append(chat_recurring_questions.successful_gpt_responses, p_gpt_response)
      ELSE chat_recurring_questions.successful_gpt_responses
    END,
    last_asked_at = now(),
    updated_at = now();

  -- Update learning suggestion if asked frequently
  UPDATE chat_recurring_questions
  SET suggested_for_learning = true,
      learning_priority = ask_count
  WHERE question_normalized = v_normalized
  AND ask_count >= 3
  AND NOT has_knowledge_entry;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: auto_learn_from_success_pattern
-- Automatically creates knowledge from successful patterns
-- Runs periodically to find questions with high success rate
-- =====================================================
CREATE OR REPLACE FUNCTION auto_learn_from_success_pattern()
RETURNS TABLE(
  learned_count integer,
  questions_processed integer
) AS $$
DECLARE
  v_question RECORD;
  v_learned_count integer := 0;
  v_processed_count integer := 0;
  v_best_response text;
BEGIN
  -- Find recurring questions with high success rate
  FOR v_question IN
    SELECT *
    FROM chat_recurring_questions
    WHERE ask_count >= 5
    AND array_length(successful_gpt_responses, 1) >= 3
    AND NOT has_knowledge_entry
    AND NOT suggested_for_learning
    ORDER BY ask_count DESC
    LIMIT 20
  LOOP
    v_processed_count := v_processed_count + 1;

    -- Get most common successful response
    SELECT successful_gpt_responses[1]
    INTO v_best_response
    FROM chat_recurring_questions
    WHERE id = v_question.id;

    -- Create knowledge entry
    BEGIN
      INSERT INTO chat_knowledge_base (
        question_pattern,
        answer_template,
        category,
        keywords,
        source,
        source_id,
        confidence_threshold,
        is_active,
        usage_count,
        success_count
      ) VALUES (
        v_question.question_normalized,
        v_best_response,
        v_question.category,
        v_question.keywords,
        'chat_learning',
        v_question.id,
        0.80,
        true,
        v_question.ask_count,
        array_length(v_question.successful_gpt_responses, 1)
      );

      -- Mark as having knowledge entry
      UPDATE chat_recurring_questions
      SET has_knowledge_entry = true,
          updated_at = now()
      WHERE id = v_question.id;

      v_learned_count := v_learned_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Skip if error (e.g., duplicate)
      CONTINUE;
    END;
  END LOOP;

  RETURN QUERY SELECT v_learned_count, v_processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: deactivate_low_performing_knowledge
-- Automatically deactivates knowledge entries with low success rate
-- =====================================================
CREATE OR REPLACE FUNCTION deactivate_low_performing_knowledge()
RETURNS TABLE(
  deactivated_count integer,
  entries_checked integer
) AS $$
DECLARE
  v_deactivated integer := 0;
  v_checked integer := 0;
  v_entry RECORD;
BEGIN
  -- Find active entries with low performance
  FOR v_entry IN
    SELECT *
    FROM chat_knowledge_base
    WHERE is_active = true
    AND usage_count >= 10
    AND success_rate < 40
  LOOP
    v_checked := v_checked + 1;

    -- Create history entry
    INSERT INTO chat_knowledge_history (
      knowledge_id,
      version,
      change_type,
      question_pattern,
      answer_template,
      category,
      keywords,
      confidence_threshold,
      is_active,
      usage_count,
      success_count,
      success_rate,
      change_reason
    ) VALUES (
      v_entry.id,
      COALESCE((
        SELECT MAX(version) + 1
        FROM chat_knowledge_history
        WHERE knowledge_id = v_entry.id
      ), 1),
      'deactivated',
      v_entry.question_pattern,
      v_entry.answer_template,
      v_entry.category,
      v_entry.keywords,
      v_entry.confidence_threshold,
      v_entry.is_active,
      v_entry.usage_count,
      v_entry.success_count,
      v_entry.success_rate,
      'Auto-deactivated due to low success rate (<40%)'
    );

    -- Deactivate entry
    UPDATE chat_knowledge_base
    SET is_active = false,
        last_updated = now()
    WHERE id = v_entry.id;

    v_deactivated := v_deactivated + 1;
  END LOOP;

  RETURN QUERY SELECT v_deactivated, v_checked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: approve_learning_queue_entry
-- Admin function to approve and activate a learning queue entry
-- =====================================================
CREATE OR REPLACE FUNCTION approve_learning_queue_entry(
  p_queue_id uuid,
  p_admin_user_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_queue RECORD;
  v_knowledge_id uuid;
BEGIN
  -- Get queue entry
  SELECT * INTO v_queue
  FROM chat_learning_queue
  WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue entry not found';
  END IF;

  IF v_queue.status != 'pending' THEN
    RAISE EXCEPTION 'Entry has already been reviewed';
  END IF;

  -- Create knowledge entry
  INSERT INTO chat_knowledge_base (
    question_pattern,
    answer_template,
    category,
    keywords,
    source,
    source_id,
    confidence_threshold,
    is_active,
    language
  ) VALUES (
    v_queue.question_pattern,
    v_queue.answer_template,
    v_queue.category,
    v_queue.keywords,
    'chat_learning',
    v_queue.source_id,
    v_queue.confidence_score,
    true,
    v_queue.language
  )
  RETURNING id INTO v_knowledge_id;

  -- Update queue entry
  UPDATE chat_learning_queue
  SET status = 'approved',
      reviewed_by = p_admin_user_id,
      reviewed_at = now(),
      review_notes = p_notes,
      knowledge_entry_id = v_knowledge_id,
      updated_at = now()
  WHERE id = p_queue_id;

  -- If source was feedback, mark as learned
  IF v_queue.source_type = 'feedback' THEN
    UPDATE chat_feedback_details
    SET learning_status = 'learned',
        learned_at = now(),
        reviewed_by = p_admin_user_id
    WHERE id = v_queue.source_id;
  END IF;

  RETURN v_knowledge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: get_learning_analytics
-- Returns analytics about the learning system
-- =====================================================
CREATE OR REPLACE FUNCTION get_learning_analytics(
  p_days_back integer DEFAULT 30
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'feedback_stats', (
      SELECT jsonb_build_object(
        'total_feedback', COUNT(*),
        'pending', COUNT(*) FILTER (WHERE learning_status = 'pending'),
        'learned', COUNT(*) FILTER (WHERE learning_status = 'learned'),
        'auto_learned', COUNT(*) FILTER (WHERE learning_status = 'auto_learned'),
        'rejected', COUNT(*) FILTER (WHERE learning_status = 'rejected'),
        'with_retry', COUNT(*) FILTER (WHERE retry_attempted = true),
        'retry_success_rate', ROUND(
          COUNT(*) FILTER (WHERE improved_answer_helpful = true)::decimal /
          NULLIF(COUNT(*) FILTER (WHERE retry_attempted = true), 0) * 100, 2
        )
      )
      FROM chat_feedback_details
      WHERE created_at >= now() - (p_days_back || ' days')::interval
    ),
    'learning_queue_stats', (
      SELECT jsonb_build_object(
        'total_queue', COUNT(*),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'approved', COUNT(*) FILTER (WHERE status = 'approved'),
        'auto_approved', COUNT(*) FILTER (WHERE status = 'auto_approved'),
        'rejected', COUNT(*) FILTER (WHERE status = 'rejected')
      )
      FROM chat_learning_queue
      WHERE created_at >= now() - (p_days_back || ' days')::interval
    ),
    'knowledge_stats', (
      SELECT jsonb_build_object(
        'total_entries', COUNT(*),
        'active_entries', COUNT(*) FILTER (WHERE is_active = true),
        'learned_entries', COUNT(*) FILTER (WHERE source = 'chat_learning'),
        'avg_success_rate', ROUND(AVG(success_rate), 2),
        'high_performers', COUNT(*) FILTER (WHERE success_rate >= 80 AND usage_count >= 5),
        'low_performers', COUNT(*) FILTER (WHERE success_rate < 40 AND usage_count >= 10)
      )
      FROM chat_knowledge_base
    ),
    'recurring_questions_stats', (
      SELECT jsonb_build_object(
        'total_questions', COUNT(*),
        'suggested_for_learning', COUNT(*) FILTER (WHERE suggested_for_learning = true),
        'has_knowledge', COUNT(*) FILTER (WHERE has_knowledge_entry = true),
        'top_questions', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'question', question_normalized,
              'count', ask_count,
              'priority', learning_priority
            )
            ORDER BY ask_count DESC
          )
          FROM chat_recurring_questions
          WHERE NOT has_knowledge_entry
          LIMIT 10
        )
      )
      FROM chat_recurring_questions
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Auto-archive knowledge base changes
-- =====================================================
CREATE OR REPLACE FUNCTION archive_knowledge_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO chat_knowledge_history (
      knowledge_id,
      version,
      change_type,
      question_pattern,
      answer_template,
      category,
      keywords,
      confidence_threshold,
      is_active,
      usage_count,
      success_count,
      success_rate,
      change_reason
    ) VALUES (
      OLD.id,
      COALESCE((
        SELECT MAX(version) + 1
        FROM chat_knowledge_history
        WHERE knowledge_id = OLD.id
      ), 1),
      CASE
        WHEN NEW.is_active != OLD.is_active AND NEW.is_active = false THEN 'deactivated'
        WHEN NEW.is_active != OLD.is_active AND NEW.is_active = true THEN 'reactivated'
        WHEN NEW.answer_template != OLD.answer_template THEN 'improved'
        ELSE 'updated'
      END,
      OLD.question_pattern,
      OLD.answer_template,
      OLD.category,
      OLD.keywords,
      OLD.confidence_threshold,
      OLD.is_active,
      OLD.usage_count,
      OLD.success_count,
      OLD.success_rate,
      'Automatic archive before update'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER archive_knowledge_trigger
  BEFORE UPDATE ON chat_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION archive_knowledge_change();