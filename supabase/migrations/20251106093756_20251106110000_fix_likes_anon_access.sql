/*
  # Fix Likes Table - Anon Access

  1. Änderungen
    - Likes-Policy für anonyme Benutzer hinzufügen
    - Gäste können Likes sehen (SELECT)
    - Gäste können NICHT liken (INSERT/DELETE)

  2. Sicherheit
    - Nur authentifizierte Benutzer können liken
    - Jeder kann Like-Counts sehen
*/

-- Policy: Auch anonyme Benutzer können Likes sehen
DROP POLICY IF EXISTS "Users can view all likes" ON likes;

CREATE POLICY "Everyone can view likes"
  ON likes
  FOR SELECT
  TO authenticated, anon
  USING (true);
