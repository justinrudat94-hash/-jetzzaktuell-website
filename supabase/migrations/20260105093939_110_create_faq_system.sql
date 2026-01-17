/*
  # Create FAQ and AI Chat Support System

  1. New Tables
    - `faq_items`
      - Stores FAQ questions and answers with categories
      - Tracks usage statistics and helpfulness ratings
      - Supports multilingual content
    
    - `faq_suggestions`
      - Automatic suggestions from recurring support issues
      - Tracks approval status and admin review
      - Links to original recurring_issues
    
    - `faq_user_feedback`
      - Tracks if FAQ articles were helpful to users
      - Provides data for improving FAQ quality

  2. Security
    - Enable RLS on all tables
    - Public read access for faq_items (published only)
    - Admin-only write access for FAQ management
    - Authenticated users can provide feedback
*/

-- Create faq_items table
CREATE TABLE IF NOT EXISTS faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  question_de text NOT NULL,
  answer_de text NOT NULL,
  question_en text,
  answer_en text,
  question_tr text,
  answer_tr text,
  tags text[] DEFAULT '{}',
  priority integer DEFAULT 0,
  is_published boolean DEFAULT false,
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create faq_suggestions table
CREATE TABLE IF NOT EXISTS faq_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('recurring_issue', 'chat_escalation', 'manual', 'ticket_pattern')),
  source_id uuid,
  suggested_question text NOT NULL,
  suggested_answer text,
  category text,
  frequency integer DEFAULT 1,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  implemented_as_faq_id uuid REFERENCES faq_items(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create faq_user_feedback table
CREATE TABLE IF NOT EXISTS faq_user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_item_id uuid REFERENCES faq_items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  was_helpful boolean NOT NULL,
  feedback_text text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(faq_item_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(category);
CREATE INDEX IF NOT EXISTS idx_faq_items_published ON faq_items(is_published);
CREATE INDEX IF NOT EXISTS idx_faq_items_priority ON faq_items(priority DESC);
CREATE INDEX IF NOT EXISTS idx_faq_suggestions_status ON faq_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_faq_suggestions_frequency ON faq_suggestions(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_faq_user_feedback_faq ON faq_user_feedback(faq_item_id);

-- Enable RLS
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for faq_items
CREATE POLICY "Anyone can view published FAQs"
  ON faq_items FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all FAQs"
  ON faq_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert FAQs"
  ON faq_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update FAQs"
  ON faq_items FOR UPDATE
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

CREATE POLICY "Admins can delete FAQs"
  ON faq_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for faq_suggestions
CREATE POLICY "Admins can view all FAQ suggestions"
  ON faq_suggestions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can create FAQ suggestions"
  ON faq_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update FAQ suggestions"
  ON faq_suggestions FOR UPDATE
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

-- RLS Policies for faq_user_feedback
CREATE POLICY "Users can view their own feedback"
  ON faq_user_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
  ON faq_user_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can give feedback"
  ON faq_user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to update FAQ stats when feedback is given
CREATE OR REPLACE FUNCTION update_faq_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.was_helpful THEN
      UPDATE faq_items 
      SET helpful_count = helpful_count + 1
      WHERE id = NEW.faq_item_id;
    ELSE
      UPDATE faq_items 
      SET not_helpful_count = not_helpful_count + 1
      WHERE id = NEW.faq_item_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for FAQ feedback
CREATE TRIGGER update_faq_stats_trigger
  AFTER INSERT ON faq_user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_stats();

-- Function to increment FAQ view count
CREATE OR REPLACE FUNCTION increment_faq_view(faq_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE faq_items 
  SET view_count = view_count + 1
  WHERE id = faq_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
