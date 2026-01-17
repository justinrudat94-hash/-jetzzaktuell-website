/*
  # Conversation Context System
  
  1. Neue Tabellen
    - `conversation_context` - Speichert aktuellen Fokus/Problem
    - `open_tasks` - Trackt offene Aufgaben
    - `decision_log` - Dokumentiert wichtige Entscheidungen
  
  2. Security
    - Admin-only Zugriff für alle Tabellen
*/

-- Conversation Context Table
CREATE TABLE IF NOT EXISTS conversation_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_problem text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  priority text NOT NULL DEFAULT 'medium',
  context_data jsonb DEFAULT '{}',
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Open Tasks Table
CREATE TABLE IF NOT EXISTS open_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  related_files text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Decision Log Table
CREATE TABLE IF NOT EXISTS decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision text NOT NULL,
  reason text NOT NULL,
  impact text,
  files_affected text[],
  created_at timestamptz DEFAULT now()
);

-- RLS Policies (Admin-only)
ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_log ENABLE ROW LEVEL SECURITY;

-- Admin kann alles sehen und bearbeiten
CREATE POLICY "Admin full access to context"
  ON conversation_context FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to tasks"
  ON open_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to decisions"
  ON decision_log FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Initiales Problem eintragen
INSERT INTO conversation_context (current_problem, status, priority, context_data)
VALUES (
  'Ticket-Seite zeigt keine Inhalte - nur Token wird angezeigt',
  'in_progress',
  'high',
  jsonb_build_object(
    'description', 'Support-Email-Ticket-Seite lädt, zeigt aber nur "Ticket" + Token. Keine Nachrichten, kein Antwort-Formular.',
    'url', 'https://app.jetzzapp.com/ticket/466089b2-a725-4871-b776-da13bcccfc28',
    'seit', 'einer Woche',
    'versucht', ARRAY['ENV-Variablen gesetzt', 'Mehrfach redeployed', 'Build-Cache gelöscht', 'Next.js Config angepasst']
  )
);

-- Offene Tasks
INSERT INTO open_tasks (task_name, description, status, related_files)
VALUES 
  ('Ticket-Seite Server-Side Rendering prüfen', 'Seite wird nicht richtig gerendert - prüfen ob SSR korrekt funktioniert', 'open', ARRAY['web/app/ticket/[token]/page.tsx']),
  ('Vercel Deployment verifizieren', 'Sicherstellen dass neue Config deployed wurde', 'open', ARRAY['web/next.config.js']);
