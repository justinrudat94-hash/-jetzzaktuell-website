/*
  # Fix event_participants user_id type

  1. Änderungen
    - `user_id` von uuid auf text ändern (für custom user IDs)
    - Bestehende Daten werden beibehalten
    - Foreign Key Constraint wird entfernt (keine Supabase Auth)

  2. Grund
    - App verwendet custom User-IDs (z.B. "user_1762167047187_47wotux75vd")
    - Keine Supabase Auth Integration
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_update_event_participants ON event_participants;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Everyone can view participants" ON event_participants;
DROP POLICY IF EXISTS "Authenticated users can participate" ON event_participants;
DROP POLICY IF EXISTS "Users can remove own participation" ON event_participants;
DROP POLICY IF EXISTS "Users can join events" ON event_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON event_participants;
DROP POLICY IF EXISTS "Users can view participants" ON event_participants;

-- Drop existing foreign key constraint
ALTER TABLE event_participants DROP CONSTRAINT IF EXISTS event_participants_user_id_fkey;

-- Change user_id type from uuid to text
ALTER TABLE event_participants
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- Update unique constraint
ALTER TABLE event_participants
  DROP CONSTRAINT IF EXISTS event_participants_event_id_user_id_key;

ALTER TABLE event_participants
  ADD CONSTRAINT event_participants_event_id_user_id_key UNIQUE(event_id, user_id);

-- Recreate policies (now without auth.uid())
CREATE POLICY "Everyone can view participants"
  ON event_participants
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can participate"
  ON event_participants
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can remove participation"
  ON event_participants
  FOR DELETE
  TO authenticated, anon
  USING (true);

-- Recreate trigger
CREATE TRIGGER trigger_update_event_participants
  AFTER INSERT OR DELETE ON event_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_event_participants_count();