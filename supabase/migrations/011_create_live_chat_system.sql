/*
  # Live Chat System für Livestreams

  1. Neue Tabellen
    - `live_chat_messages`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key zu events)
      - `user_id` (uuid, foreign key zu auth.users)
      - `message` (text)
      - `created_at` (timestamptz)
      - `is_deleted` (boolean)

  2. Änderungen an events Tabelle
    - `stream_url` (text) - URL zum Livestream
    - `stream_started_at` (timestamptz) - Wann der Stream gestartet wurde
    - `viewer_count` (integer) - Aktuelle Zuschauerzahl
    - `peak_viewer_count` (integer) - Höchste Zuschauerzahl
    - `coins_earned` (integer) - Verdiente Coins durch Stream

  3. Security
    - Enable RLS für live_chat_messages
    - Policies für Chat-Nachrichten (Lesen: alle, Schreiben: authentifiziert)
    - Policies für Stream-Updates (nur Ersteller)
*/

-- Erweitere events Tabelle um Livestream-Felder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'stream_url'
  ) THEN
    ALTER TABLE events ADD COLUMN stream_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'stream_started_at'
  ) THEN
    ALTER TABLE events ADD COLUMN stream_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'viewer_count'
  ) THEN
    ALTER TABLE events ADD COLUMN viewer_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'peak_viewer_count'
  ) THEN
    ALTER TABLE events ADD COLUMN peak_viewer_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'coins_earned'
  ) THEN
    ALTER TABLE events ADD COLUMN coins_earned integer DEFAULT 0;
  END IF;
END $$;

-- Erstelle live_chat_messages Tabelle
CREATE TABLE IF NOT EXISTS live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  CONSTRAINT message_length CHECK (char_length(message) <= 500)
);

-- Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_chat_messages_event_id ON live_chat_messages(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON live_chat_messages(user_id);

-- Enable RLS
ALTER TABLE live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies für live_chat_messages
CREATE POLICY "Jeder kann Chat-Nachrichten lesen"
  ON live_chat_messages FOR SELECT
  USING (NOT is_deleted);

CREATE POLICY "Authentifizierte Benutzer können Nachrichten senden"
  ON live_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND is_live = true)
  );

CREATE POLICY "Benutzer können eigene Nachrichten löschen"
  ON live_chat_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Funktion zum Aktualisieren der Zuschauerzahl
CREATE OR REPLACE FUNCTION update_viewer_count(
  p_event_id uuid,
  p_increment boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count integer;
BEGIN
  IF p_increment THEN
    UPDATE events
    SET viewer_count = COALESCE(viewer_count, 0) + 1
    WHERE id = p_event_id
    RETURNING viewer_count INTO v_new_count;

    UPDATE events
    SET peak_viewer_count = GREATEST(COALESCE(peak_viewer_count, 0), v_new_count)
    WHERE id = p_event_id;
  ELSE
    UPDATE events
    SET viewer_count = GREATEST(0, COALESCE(viewer_count, 0) - 1)
    WHERE id = p_event_id;
  END IF;
END;
$$;

-- Funktion zum Starten eines Livestreams
CREATE OR REPLACE FUNCTION start_livestream(
  p_event_id uuid,
  p_stream_url text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  UPDATE events
  SET
    is_live = true,
    stream_url = p_stream_url,
    stream_started_at = now(),
    viewer_count = 0
  WHERE id = p_event_id AND creator_id = auth.uid()
  RETURNING json_build_object(
    'success', true,
    'event_id', id,
    'stream_started_at', stream_started_at
  ) INTO v_result;

  IF v_result IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht berechtigt');
  END IF;

  RETURN v_result;
END;
$$;

-- Funktion zum Beenden eines Livestreams
CREATE OR REPLACE FUNCTION stop_livestream(
  p_event_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  UPDATE events
  SET
    is_live = false,
    stream_url = NULL,
    viewer_count = 0
  WHERE id = p_event_id AND creator_id = auth.uid()
  RETURNING json_build_object(
    'success', true,
    'event_id', id,
    'peak_viewers', peak_viewer_count,
    'coins_earned', coins_earned
  ) INTO v_result;

  IF v_result IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht berechtigt');
  END IF;

  RETURN v_result;
END;
$$;

-- Funktion zum Senden von Coins an Streamer
CREATE OR REPLACE FUNCTION send_coins_to_streamer(
  p_streamer_id uuid,
  p_amount integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET coins = COALESCE(coins, 0) + p_amount
  WHERE id = p_streamer_id;

  INSERT INTO reward_transactions (
    user_id,
    type,
    coins_change,
    description
  ) VALUES (
    p_streamer_id,
    'donation',
    p_amount,
    'Coins von Zuschauer erhalten'
  );

  RETURN json_build_object('success', true, 'amount', p_amount);
END;
$$;

-- Funktion zum Erhöhen der Like-Anzahl
CREATE OR REPLACE FUNCTION increment_like_count(
  p_event_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE events
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = p_event_id;

  UPDATE events
  SET coins_earned = COALESCE(coins_earned, 0) + 1
  WHERE id = p_event_id;
END;
$$;
