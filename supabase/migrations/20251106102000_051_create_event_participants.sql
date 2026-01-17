/*
  # Event-Teilnahme System

  1. Neue Tabelle
    - `event_participants`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key -> events)
      - `user_id` (uuid, foreign key -> auth.users)
      - `created_at` (timestamp)
      - Unique constraint auf (event_id, user_id)

  2. Sicherheit
    - RLS aktivieren
    - Policies:
      - Benutzer können ihre eigenen Teilnahmen sehen
      - Benutzer können teilnehmen (INSERT)
      - Benutzer können ihre Teilnahme aufheben (DELETE)
      - Jeder kann Teilnehmerzahlen sehen (SELECT count)

  3. Trigger
    - Bei INSERT: event.current_participants++
    - Bei DELETE: event.current_participants--
*/

-- Tabelle erstellen
CREATE TABLE IF NOT EXISTS event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);

-- RLS aktivieren
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Jeder kann Teilnahmen sehen (für Zählungen)
CREATE POLICY "Everyone can view participants"
  ON event_participants
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy: Authentifizierte Benutzer können teilnehmen
CREATE POLICY "Authenticated users can participate"
  ON event_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Benutzer können ihre eigene Teilnahme aufheben
CREATE POLICY "Users can remove own participation"
  ON event_participants
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Funktion: Teilnehmerzahl aktualisieren
CREATE OR REPLACE FUNCTION update_event_participants_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events
    SET current_participants = current_participants + 1
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events
    SET current_participants = GREATEST(0, current_participants - 1)
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger erstellen
DROP TRIGGER IF EXISTS trigger_update_event_participants ON event_participants;
CREATE TRIGGER trigger_update_event_participants
  AFTER INSERT OR DELETE ON event_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_event_participants_count();

-- Aktuelle Teilnehmerzahlen korrigieren (falls nötig)
UPDATE events e
SET current_participants = (
  SELECT COUNT(*)
  FROM event_participants ep
  WHERE ep.event_id = e.id
);
