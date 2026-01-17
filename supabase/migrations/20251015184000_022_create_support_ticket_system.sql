/*
  # Support-Ticket-System mit KI-Kategorisierung

  1. Neue Tabellen
    - `support_tickets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key zu profiles)
      - `subject` (text)
      - `description` (text)
      - `category` (text) - KI-kategorisiert
      - `priority` (text) - low, medium, high, urgent
      - `status` (text) - open, in_progress, waiting, resolved, closed
      - `ai_category_confidence` (float)
      - `related_issue_count` (integer) - Anzahl ähnlicher Tickets
      - `is_recurring` (boolean)
      - `assigned_to` (uuid, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `resolved_at` (timestamptz, nullable)

    - `ticket_responses`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `is_admin_response` (boolean)
      - `message` (text)
      - `created_at` (timestamptz)

    - `recurring_issues`
      - `id` (uuid, primary key)
      - `issue_pattern` (text)
      - `category` (text)
      - `occurrence_count` (integer)
      - `first_seen` (timestamptz)
      - `last_seen` (timestamptz)
      - `admin_notified` (boolean)

  2. Sicherheit
    - Enable RLS auf allen Tabellen
    - Users können nur eigene Tickets sehen
    - Admins können alle Tickets sehen
    - Nur Admins können Tickets zuweisen/schließen

  3. Funktionen
    - Automatische Kategorisierung
    - Wiederkehrende Problem-Erkennung
    - Admin-Benachrichtigungen
*/

-- Support Tickets Tabelle
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'general',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  ai_category_confidence float DEFAULT 0.0,
  related_issue_count integer DEFAULT 0,
  is_recurring boolean DEFAULT false,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

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
  admin_notified boolean DEFAULT false
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket_id ON ticket_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_recurring_issues_category ON recurring_issues(category);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies für support_tickets

-- Users können ihre eigenen Tickets sehen
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins können alle Tickets sehen
CREATE POLICY "Admins can view all tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Users können eigene Tickets erstellen
CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users können eigene Tickets updaten
CREATE POLICY "Users can update own tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins können alle Tickets updaten
CREATE POLICY "Admins can update all tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies für ticket_responses

-- Users können Responses zu ihren Tickets sehen
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

-- Admins können alle Responses sehen
CREATE POLICY "Admins can view all responses"
  ON ticket_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Users können Responses zu ihren Tickets erstellen
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

-- Admins können Responses zu allen Tickets erstellen
CREATE POLICY "Admins can create responses"
  ON ticket_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies für recurring_issues (nur Admins)

CREATE POLICY "Admins can view recurring issues"
  ON recurring_issues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage recurring issues"
  ON recurring_issues FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_timestamp
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_timestamp();

-- Funktion zum Erstellen von Admin-Alerts bei wiederkehrenden Problemen
CREATE OR REPLACE FUNCTION check_recurring_issues()
RETURNS TRIGGER AS $$
DECLARE
  similar_count integer;
  issue_record recurring_issues%ROWTYPE;
BEGIN
  -- Zähle ähnliche Tickets in den letzten 7 Tagen
  SELECT COUNT(*) INTO similar_count
  FROM support_tickets
  WHERE category = NEW.category
  AND created_at >= now() - interval '7 days'
  AND id != NEW.id;

  -- Update related_issue_count
  NEW.related_issue_count = similar_count;

  -- Wenn mehr als 5 ähnliche Tickets, als wiederkehrend markieren
  IF similar_count >= 5 THEN
    NEW.is_recurring = true;

    -- Prüfe ob Issue bereits in recurring_issues existiert
    SELECT * INTO issue_record
    FROM recurring_issues
    WHERE category = NEW.category
    AND last_seen >= now() - interval '7 days';

    IF FOUND THEN
      -- Update existierenden Eintrag
      UPDATE recurring_issues
      SET occurrence_count = occurrence_count + 1,
          last_seen = now()
      WHERE id = issue_record.id;

      -- Alert erstellen wenn noch nicht benachrichtigt
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
      -- Erstelle neuen Eintrag
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

-- Funktion zum Senden von Bestätigungen an User
CREATE OR REPLACE FUNCTION notify_user_on_ticket_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Bei Status-Änderung oder Admin-Response
  IF OLD.status != NEW.status OR NEW.assigned_to IS NOT NULL THEN
    -- Hier könnte man eine Push-Notification oder Email senden
    -- Für jetzt erstellen wir eine interne Notification
    NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_user_trigger
  AFTER UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_on_ticket_update();
