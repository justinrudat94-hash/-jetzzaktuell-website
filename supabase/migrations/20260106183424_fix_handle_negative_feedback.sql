/*
  # Fix handle_negative_feedback Function
  
  Der v_user_question Variable war im falschen Scope deklariert,
  was dazu führte, dass sie NULL war beim INSERT in chat_feedback_details.
  
  ## Changes
  - v_user_question jetzt im Haupt-DECLARE Block
  - Korrektes Abrufen der User-Frage
*/

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
  v_user_question text;
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
  SELECT message INTO v_user_question
  FROM chat_messages
  WHERE conversation_id = v_conversation_id
  AND sender_type = 'user'
  AND created_at < v_message.created_at
  ORDER BY created_at DESC
  LIMIT 1;

  -- Fallback if no question found
  IF v_user_question IS NULL THEN
    v_user_question := 'Frage nicht gefunden';
  END IF;

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