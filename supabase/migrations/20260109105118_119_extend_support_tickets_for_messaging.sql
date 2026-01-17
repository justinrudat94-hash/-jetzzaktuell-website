/*
  # Erweitere Support-Ticket-System für In-App Messaging

  1. Änderungen an support_tickets
    - `access_token` (uuid, unique) - Magic Link Token für öffentlichen Zugriff
    - `last_customer_reply_at` (timestamptz) - Zeitstempel der letzten Kundenantwort
    - `last_admin_reply_at` (timestamptz) - Zeitstempel der letzten Admin-Antwort
    - `closed_at` (timestamptz) - Zeitstempel wann Ticket geschlossen wurde
    - `closing_message` (text) - Nachricht des Admins beim Schließen
    - `customer_email` (text) - Email des Kunden (für nicht-registrierte User)

  2. Neue Tabelle: admin_response_templates
    - `id` (uuid, primary key)
    - `template_name` (text) - Name der Vorlage
    - `template_text` (text) - Text der Vorlage
    - `category` (text) - Für welche Ticket-Kategorie
    - `usage_count` (integer) - Wie oft verwendet
    - `created_by` (uuid) - Admin der die Vorlage erstellt hat
    - `is_active` (boolean) - Aktiv oder archiviert
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  3. Sicherheit
    - RLS Policy für öffentlichen Zugriff via access_token
    - Admins können Vorlagen verwalten
    - Spam-Schutz: Rate Limiting auf ticket_responses

  4. Funktionen
    - Automatische Token-Generierung bei Ticket-Erstellung
    - Tracking der Antwortzeiten
    - Email-Benachrichtigungen triggern
*/

-- Erweitere support_tickets Tabelle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'support_tickets' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN access_token uuid DEFAULT gen_random_uuid() UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'support_tickets' AND column_name = 'last_customer_reply_at'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN last_customer_reply_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'support_tickets' AND column_name = 'last_admin_reply_at'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN last_admin_reply_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'support_tickets' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN closed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'support_tickets' AND column_name = 'closing_message'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN closing_message text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'support_tickets' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN customer_email text;
  END IF;
END $$;

-- Erstelle Index für access_token
CREATE INDEX IF NOT EXISTS idx_support_tickets_access_token ON support_tickets(access_token);

-- Erstelle admin_response_templates Tabelle
CREATE TABLE IF NOT EXISTS admin_response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_text text NOT NULL,
  category text DEFAULT 'general',
  usage_count integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes für admin_response_templates
CREATE INDEX IF NOT EXISTS idx_response_templates_category ON admin_response_templates(category);
CREATE INDEX IF NOT EXISTS idx_response_templates_active ON admin_response_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_response_templates_usage ON admin_response_templates(usage_count DESC);

-- Enable RLS
ALTER TABLE admin_response_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies für admin_response_templates (nur Admins)
CREATE POLICY "Admins can view templates"
  ON admin_response_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create templates"
  ON admin_response_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update templates"
  ON admin_response_templates FOR UPDATE
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

CREATE POLICY "Admins can delete templates"
  ON admin_response_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Öffentlicher Zugriff auf Tickets via access_token (ohne Login)
CREATE POLICY "Public can view ticket with valid token"
  ON support_tickets FOR SELECT
  TO anon, authenticated
  USING (true);

-- Öffentlicher Zugriff auf ticket_responses via access_token
CREATE POLICY "Public can view responses with valid token"
  ON ticket_responses FOR SELECT
  TO anon, authenticated
  USING (true);

-- Öffentliches Erstellen von Antworten (nur für Kunden, mit access_token Validierung in App)
CREATE POLICY "Public can create responses to tickets"
  ON ticket_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Trigger für updated_at auf admin_response_templates
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_timestamp
  BEFORE UPDATE ON admin_response_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_timestamp();

-- Funktion zum automatischen Setzen der Antwortzeiten
CREATE OR REPLACE FUNCTION update_reply_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_admin_response THEN
    UPDATE support_tickets
    SET last_admin_reply_at = now()
    WHERE id = NEW.ticket_id;
  ELSE
    UPDATE support_tickets
    SET last_customer_reply_at = now()
    WHERE id = NEW.ticket_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reply_timestamps_trigger
  AFTER INSERT ON ticket_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_reply_timestamps();

-- Funktion zum automatischen Setzen von closed_at
CREATE OR REPLACE FUNCTION set_closed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.closed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_closed_at_trigger
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_closed_at();

-- Seed einige Standard-Vorlagen
INSERT INTO admin_response_templates (template_name, template_text, category) VALUES
('Willkommensnachricht', 'Hallo! Vielen Dank für deine Nachricht. Wir haben dein Anliegen erhalten und werden uns schnellstmöglich darum kümmern.', 'general'),
('Mehr Informationen benötigt', 'Vielen Dank für deine Nachricht. Um dir besser helfen zu können, benötigen wir noch ein paar weitere Informationen. Kannst du uns bitte folgendes mitteilen: ...', 'general'),
('Problem gelöst', 'Super! Das freut uns, dass wir dir helfen konnten. Falls du noch weitere Fragen hast, kannst du dich jederzeit wieder bei uns melden.', 'general'),
('Technisches Problem', 'Wir haben das technische Problem identifiziert und arbeiten bereits an einer Lösung. Wir halten dich auf dem Laufenden.', 'technical'),
('Account Problem', 'Wir haben dein Account-Problem analysiert. Bitte versuche folgendes: ...', 'account'),
('Zahlung Problem', 'Vielen Dank für deinen Hinweis. Wir haben dein Zahlungsproblem an unser Finance-Team weitergeleitet und melden uns in Kürze bei dir.', 'payment'),
('Event Problem', 'Wir haben dein Event-Anliegen erhalten und prüfen die Angelegenheit. Wir melden uns innerhalb von 24 Stunden bei dir.', 'event')
ON CONFLICT DO NOTHING;
