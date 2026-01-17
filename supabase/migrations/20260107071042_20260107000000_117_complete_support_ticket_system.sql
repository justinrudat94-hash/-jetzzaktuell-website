/*
  # Komplettes Support-Ticket-System für KI-Antworten und Email-Integration

  1. Erweitere bestehende support_tickets Tabelle
    - Füge fehlende Felder hinzu (priority, ai_category_confidence, etc.)
    
  2. Neue Tabellen
    - `ticket_responses` - Admin und User Antworten
    - `recurring_issues` - Wiederkehrende Probleme
    - `ticket_email_tracking` - Email-Kommunikation
    - `recurring_ticket_solutions` - Erfolgreiche Lösungen
    - `ticket_retention_policies` - 6 Monate Aufbewahrung
    - `ai_ticket_responses` - KI-generierte Antworten

  3. Funktionen für Automatisierung
    - Track successful resolution
    - Suggest FAQ from recurring issues
    - Create knowledge base from tickets
    
  4. Sicherheit
    - RLS auf allen Tabellen
*/

-- Erweitere support_tickets Tabelle mit fehlenden Feldern
DO $$
BEGIN
  -- priority
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'priority') THEN
    ALTER TABLE support_tickets ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;
  
  -- ai_category_confidence
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'ai_category_confidence') THEN
    ALTER TABLE support_tickets ADD COLUMN ai_category_confidence float DEFAULT 0.0;
  END IF;
  
  -- related_issue_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'related_issue_count') THEN
    ALTER TABLE support_tickets ADD COLUMN related_issue_count integer DEFAULT 0;
  END IF;
  
  -- is_recurring
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'is_recurring') THEN
    ALTER TABLE support_tickets ADD COLUMN is_recurring boolean DEFAULT false;
  END IF;
  
  -- assigned_to (rename from assigned_admin if exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'assigned_admin') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'assigned_to') THEN
    ALTER TABLE support_tickets RENAME COLUMN assigned_admin TO assigned_to;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'assigned_to') THEN
    ALTER TABLE support_tickets ADD COLUMN assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  
  -- resolved_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'resolved_at') THEN
    ALTER TABLE support_tickets ADD COLUMN resolved_at timestamptz;
  END IF;
  
  -- email_thread_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'email_thread_id') THEN
    ALTER TABLE support_tickets ADD COLUMN email_thread_id text;
  END IF;
  
  -- auto_close_scheduled_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'auto_close_scheduled_at') THEN
    ALTER TABLE support_tickets ADD COLUMN auto_close_scheduled_at timestamptz;
  END IF;
  
  -- last_user_reply_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'last_user_reply_at') THEN
    ALTER TABLE support_tickets ADD COLUMN last_user_reply_at timestamptz;
  END IF;
  
  -- reopened_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'reopened_count') THEN
    ALTER TABLE support_tickets ADD COLUMN reopened_count integer DEFAULT 0;
  END IF;
END $$;

-- Ticket Responses Tabelle
CREATE TABLE IF NOT EXISTS ticket_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_admin_response boolean DEFAULT false,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Recurring Issues Tabelle
CREATE TABLE IF NOT EXISTS recurring_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_pattern text NOT NULL,
  category text NOT NULL,
  occurrence_count integer DEFAULT 1,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  admin_notified boolean DEFAULT false,
  suggested_faq_id uuid REFERENCES faq_items(id) ON DELETE SET NULL,
  solution_success_rate float DEFAULT 0.0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored'))
);

-- Ticket Email Tracking
CREATE TABLE IF NOT EXISTS ticket_email_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  email_address text NOT NULL,
  reply_to_address text UNIQUE NOT NULL,
  thread_id text NOT NULL,
  last_email_sent_at timestamptz,
  email_count integer DEFAULT 0,
  delivery_status text DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recurring Ticket Solutions
CREATE TABLE IF NOT EXISTS recurring_ticket_solutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_issue_id uuid NOT NULL REFERENCES recurring_issues(id) ON DELETE CASCADE,
  category text NOT NULL,
  problem_pattern text NOT NULL,
  solution_text text NOT NULL,
  success_count integer DEFAULT 0,
  usage_count integer DEFAULT 0,
  success_rate float DEFAULT 0.0,
  avg_resolution_time_hours float DEFAULT 0.0,
  created_from_ticket_id uuid REFERENCES support_tickets(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_faq_candidate boolean DEFAULT false,
  added_to_faq_at timestamptz,
  added_to_knowledge_base_at timestamptz,
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ticket Retention Policies
CREATE TABLE IF NOT EXISTS ticket_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE REFERENCES support_tickets(id) ON DELETE CASCADE,
  scheduled_deletion_at timestamptz NOT NULL,
  exported_at timestamptz,
  export_path text,
  anonymized_at timestamptz,
  deletion_status text DEFAULT 'scheduled' CHECK (deletion_status IN ('scheduled', 'exported', 'anonymized', 'deleted')),
  created_at timestamptz DEFAULT now()
);

-- AI Ticket Responses
CREATE TABLE IF NOT EXISTS ai_ticket_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  generated_response text NOT NULL,
  knowledge_sources uuid[] DEFAULT '{}',
  confidence_score float DEFAULT 0.0,
  was_used boolean DEFAULT false,
  was_edited boolean DEFAULT false,
  edited_response text,
  admin_feedback text,
  user_satisfaction_score integer CHECK (user_satisfaction_score BETWEEN 1 AND 5),
  resolved_ticket boolean DEFAULT false,
  generation_time_ms integer DEFAULT 0,
  tokens_used integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket_id ON ticket_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_recurring_issues_category ON recurring_issues(category);
CREATE INDEX IF NOT EXISTS idx_ticket_email_tracking_ticket_id ON ticket_email_tracking(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_email_tracking_reply_to ON ticket_email_tracking(reply_to_address);
CREATE INDEX IF NOT EXISTS idx_recurring_solutions_recurring_id ON recurring_ticket_solutions(recurring_issue_id);
CREATE INDEX IF NOT EXISTS idx_recurring_solutions_category ON recurring_ticket_solutions(category);
CREATE INDEX IF NOT EXISTS idx_recurring_solutions_faq_candidate ON recurring_ticket_solutions(is_faq_candidate) WHERE is_faq_candidate = true;
CREATE INDEX IF NOT EXISTS idx_ticket_retention_scheduled ON ticket_retention_policies(scheduled_deletion_at) WHERE deletion_status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_ai_responses_ticket_id ON ai_ticket_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_was_used ON ai_ticket_responses(was_used) WHERE was_used = true;

-- Enable RLS
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_ticket_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ticket_responses ENABLE ROW LEVEL SECURITY;

-- RLS: ticket_responses
CREATE POLICY "Users can view responses to their tickets"
  ON ticket_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_responses.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all responses"
  ON ticket_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Users can create responses to their tickets"
  ON ticket_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_responses.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create responses"
  ON ticket_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- RLS: recurring_issues (nur Admins)
CREATE POLICY "Admins can view recurring issues"
  ON recurring_issues FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can manage recurring issues"
  ON recurring_issues FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- RLS: ticket_email_tracking
CREATE POLICY "Admins can view all email tracking"
  ON ticket_email_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Users can view own ticket email tracking"
  ON ticket_email_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_email_tracking.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage email tracking"
  ON ticket_email_tracking FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- RLS: recurring_ticket_solutions (nur Admins)
CREATE POLICY "Admins can view all solutions"
  ON recurring_ticket_solutions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can manage solutions"
  ON recurring_ticket_solutions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- RLS: ticket_retention_policies (nur Admins)
CREATE POLICY "Admins can view retention policies"
  ON ticket_retention_policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can manage retention policies"
  ON ticket_retention_policies FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- RLS: ai_ticket_responses (nur Admins)
CREATE POLICY "Admins can view AI responses"
  ON ai_ticket_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can manage AI responses"
  ON ai_ticket_responses FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Funktion: Check Recurring Issues
CREATE OR REPLACE FUNCTION check_recurring_issues()
RETURNS TRIGGER AS $$
DECLARE
  similar_count integer;
  issue_record recurring_issues%ROWTYPE;
BEGIN
  SELECT COUNT(*) INTO similar_count
  FROM support_tickets
  WHERE category = NEW.category
  AND created_at >= now() - interval '7 days'
  AND id != NEW.id;

  NEW.related_issue_count = similar_count;

  IF similar_count >= 5 THEN
    NEW.is_recurring = true;

    SELECT * INTO issue_record
    FROM recurring_issues
    WHERE category = NEW.category
    AND last_seen >= now() - interval '7 days';

    IF FOUND THEN
      UPDATE recurring_issues
      SET occurrence_count = occurrence_count + 1,
          last_seen = now()
      WHERE id = issue_record.id;

      IF NOT issue_record.admin_notified THEN
        INSERT INTO admin_alerts (
          alert_type,
          title,
          message,
          severity,
          related_content_type,
          related_content_id,
          action_required
        ) VALUES (
          'warning',
          'Wiederkehrendes Problem erkannt',
          format('Problem in Kategorie "%s" tritt wiederholt auf (%s Mal in 7 Tagen). Bitte aktiv angehen!',
                 NEW.category, similar_count + 1),
          4,
          'support_ticket',
          NEW.category,
          true
        );

        UPDATE recurring_issues
        SET admin_notified = true
        WHERE id = issue_record.id;
      END IF;
    ELSE
      INSERT INTO recurring_issues (
        issue_pattern,
        category,
        occurrence_count,
        admin_notified
      ) VALUES (
        NEW.subject,
        NEW.category,
        similar_count + 1,
        false
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_recurring_issues_trigger
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION check_recurring_issues();

-- Funktion: Track Successful Resolution
CREATE OR REPLACE FUNCTION track_successful_resolution()
RETURNS TRIGGER AS $$
DECLARE
  resolution_time_hours float;
  recurring_record recurring_issues%ROWTYPE;
BEGIN
  IF (OLD.status != NEW.status AND NEW.status IN ('resolved', 'closed')) THEN
    NEW.resolved_at = now();
    resolution_time_hours = EXTRACT(EPOCH FROM (now() - NEW.created_at)) / 3600;

    IF NEW.is_recurring THEN
      SELECT * INTO recurring_record
      FROM recurring_issues
      WHERE category = NEW.category
      AND status = 'active'
      ORDER BY last_seen DESC
      LIMIT 1;

      IF FOUND THEN
        INSERT INTO recurring_ticket_solutions (
          recurring_issue_id,
          category,
          problem_pattern,
          solution_text,
          success_count,
          usage_count,
          avg_resolution_time_hours,
          created_from_ticket_id,
          created_by,
          keywords
        )
        SELECT
          recurring_record.id,
          NEW.category,
          NEW.subject,
          COALESCE(
            (SELECT message FROM ticket_responses
             WHERE ticket_id = NEW.id
             AND is_admin_response = true
             ORDER BY created_at DESC LIMIT 1),
            'Automatisch gelöst'
          ),
          1,
          1,
          resolution_time_hours,
          NEW.id,
          NEW.assigned_to,
          string_to_array(lower(NEW.subject), ' ')
        ON CONFLICT DO NOTHING;

        UPDATE recurring_ticket_solutions
        SET
          success_count = success_count + 1,
          usage_count = usage_count + 1,
          success_rate = (success_count + 1)::float / (usage_count + 1)::float,
          avg_resolution_time_hours = (avg_resolution_time_hours * usage_count + resolution_time_hours) / (usage_count + 1),
          updated_at = now()
        WHERE recurring_issue_id = recurring_record.id
        AND problem_pattern = NEW.subject;

        UPDATE recurring_issues
        SET solution_success_rate = (
          SELECT AVG(success_rate)
          FROM recurring_ticket_solutions
          WHERE recurring_issue_id = recurring_record.id
        )
        WHERE id = recurring_record.id;

        UPDATE recurring_ticket_solutions
        SET is_faq_candidate = true
        WHERE recurring_issue_id = recurring_record.id
        AND success_rate >= 0.8
        AND usage_count >= 5
        AND is_faq_candidate = false;
      END IF;
    END IF;

    IF NEW.status = 'resolved' THEN
      NEW.auto_close_scheduled_at = now() + interval '48 hours';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_successful_resolution_trigger
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION track_successful_resolution();

-- Funktion: Schedule Ticket Retention
CREATE OR REPLACE FUNCTION schedule_ticket_retention()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    INSERT INTO ticket_retention_policies (
      ticket_id,
      scheduled_deletion_at,
      deletion_status
    ) VALUES (
      NEW.id,
      now() + interval '6 months',
      'scheduled'
    )
    ON CONFLICT (ticket_id) DO UPDATE
    SET scheduled_deletion_at = now() + interval '6 months';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedule_ticket_retention_trigger
  AFTER UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION schedule_ticket_retention();

-- Funktion: Get Recurring Issues with Solutions
CREATE OR REPLACE FUNCTION get_recurring_issues_with_solutions()
RETURNS TABLE (
  issue_id uuid,
  category text,
  problem_pattern text,
  occurrence_count integer,
  solution_success_rate float,
  has_solution boolean,
  is_faq_candidate boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ri.id as issue_id,
    ri.category,
    ri.issue_pattern as problem_pattern,
    ri.occurrence_count,
    ri.solution_success_rate,
    EXISTS(SELECT 1 FROM recurring_ticket_solutions WHERE recurring_issue_id = ri.id) as has_solution,
    EXISTS(SELECT 1 FROM recurring_ticket_solutions WHERE recurring_issue_id = ri.id AND is_faq_candidate = true) as is_faq_candidate
  FROM recurring_issues ri
  WHERE ri.status = 'active'
  ORDER BY ri.occurrence_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
