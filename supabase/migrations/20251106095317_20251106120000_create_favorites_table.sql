/*
  # Favoriten-System

  1. Neue Tabelle
    - `favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key -> auth.users)
      - `event_id` (uuid, foreign key -> events)
      - `created_at` (timestamp)
      - Unique constraint auf (user_id, event_id)

  2. Sicherheit
    - RLS aktivieren
    - Policies:
      - Benutzer können ihre eigenen Favoriten sehen
      - Benutzer können Favoriten hinzufügen (INSERT)
      - Benutzer können ihre Favoriten entfernen (DELETE)
      - Jeder kann Favoriten-Zählungen sehen

  3. Index
    - Schnelle Abfragen nach user_id
    - Schnelle Abfragen nach event_id
*/

-- Tabelle erstellen
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_event_id ON favorites(event_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- RLS aktivieren
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Jeder kann Favoriten-Counts sehen (für Statistiken)
CREATE POLICY "Everyone can view favorites"
  ON favorites
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy: Authentifizierte Benutzer können Favoriten hinzufügen
CREATE POLICY "Authenticated users can add favorites"
  ON favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Benutzer können ihre eigenen Favoriten entfernen
CREATE POLICY "Users can remove own favorites"
  ON favorites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
