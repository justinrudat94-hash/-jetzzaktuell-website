/*
  # Support-Ordner-System: Perfekte Übersicht für Admin

  1. Neue Felder in support_tickets
    - `is_favorite` - Admin kann wichtige Tickets markieren
    - `waiting_for` - Automatisch: wer muss als nächstes antworten ('admin', 'user', 'none')
    - `last_admin_response_at` - Zeitpunkt der letzten Admin-Antwort
    - `admin_read_at` - Wann Admin Ticket zuletzt angeschaut hat

  2. Trigger für automatische Kategorisierung
    - Bei Admin-Antwort: waiting_for = 'user'
    - Bei User-Antwort: waiting_for = 'admin' und reset auto-close

  3. Auto-Close Logik KORRIGIERT
    - Nur wenn Status = 'resolved' UND waiting_for = 'user' UND >48h keine User-Antwort
    - Bei User-Antwort: Timer wird komplett zurückgesetzt

  4. Ordner-Logik
    - Neue Anfragen: open + keine Admin-Antwort
    - Warte auf mich: waiting_for = 'admin' + nicht closed
    - Warte auf User: waiting_for = 'user' + nicht closed
    - Favoriten: is_favorite = true + nicht closed
    - Geschlossen: status = 'closed'
*/

-- Füge neue Felder zu support_tickets hinzu
DO $$
BEGIN
  -- is_favorite für Admin-Favoriten
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'is_favorite') THEN
    ALTER TABLE support_tickets ADD COLUMN is_favorite boolean DEFAULT false;
  END IF;

  -- waiting_for: wer muss als nächstes antworten
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'waiting_for') THEN
    ALTER TABLE support_tickets ADD COLUMN waiting_for text DEFAULT 'admin' CHECK (waiting_for IN ('admin', 'user', 'none'));
  END IF;

  -- last_admin_response_at: wann Admin zuletzt geantwortet hat
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'last_admin_response_at') THEN
    ALTER TABLE support_tickets ADD COLUMN last_admin_response_at timestamptz;
  END IF;

  -- admin_read_at: wann Admin Ticket zuletzt angeschaut hat
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'admin_read_at') THEN
    ALTER TABLE support_tickets ADD COLUMN admin_read_at timestamptz;
  END IF;
END $$;

-- Erstelle Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_tickets_is_favorite ON support_tickets(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_tickets_waiting_for ON support_tickets(waiting_for);
CREATE INDEX IF NOT EXISTS idx_tickets_last_admin_response ON support_tickets(last_admin_response_at);
CREATE INDEX IF NOT EXISTS idx_tickets_folder_new ON support_tickets(status, created_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_tickets_folder_waiting_admin ON support_tickets(waiting_for, status) WHERE waiting_for = 'admin' AND status != 'closed';
CREATE INDEX IF NOT EXISTS idx_tickets_folder_waiting_user ON support_tickets(waiting_for, status) WHERE waiting_for = 'user' AND status != 'closed';

-- Trigger: Automatische waiting_for Updates bei ticket_responses
CREATE OR REPLACE FUNCTION update_ticket_waiting_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Bei Admin-Antwort
  IF NEW.is_admin_response = true THEN
    UPDATE support_tickets
    SET
      waiting_for = 'user',
      last_admin_response_at = now(),
      updated_at = now()
    WHERE id = NEW.ticket_id;

  -- Bei User-Antwort
  ELSE
    UPDATE support_tickets
    SET
      waiting_for = 'admin',
      auto_close_scheduled_at = NULL, -- Reset Auto-Close Timer!
      updated_at = now()
    WHERE id = NEW.ticket_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Lösche alten Trigger falls vorhanden
DROP TRIGGER IF EXISTS update_waiting_status_trigger ON ticket_responses;

-- Erstelle neuen Trigger
CREATE TRIGGER update_waiting_status_trigger
  AFTER INSERT ON ticket_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_waiting_status();

-- Auto-Close Funktion KORRIGIERT: Nur bei User-Inaktivität
CREATE OR REPLACE FUNCTION check_auto_close_tickets()
RETURNS void AS $$
BEGIN
  -- Auto-Close nur wenn:
  -- 1. Status = 'resolved'
  -- 2. waiting_for = 'user' (Admin hat geantwortet, User nicht)
  -- 3. >48h seit last_admin_response_at
  -- 4. Keine User-Antwort in den letzten 48h

  UPDATE support_tickets
  SET
    status = 'closed',
    resolved_at = now(),
    updated_at = now()
  WHERE
    status = 'resolved'
    AND waiting_for = 'user'
    AND last_admin_response_at IS NOT NULL
    AND last_admin_response_at < now() - interval '48 hours'
    AND NOT EXISTS (
      SELECT 1 FROM ticket_responses
      WHERE ticket_responses.ticket_id = support_tickets.id
      AND ticket_responses.is_admin_response = false
      AND ticket_responses.created_at > support_tickets.last_admin_response_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aktualisiere bestehende Trigger für resolved Status
CREATE OR REPLACE FUNCTION update_resolved_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Wenn Status auf 'resolved' gesetzt wird
  IF OLD.status != 'resolved' AND NEW.status = 'resolved' THEN
    NEW.resolved_at = now();

    -- Setze Auto-Close nur wenn User antworten muss
    IF NEW.waiting_for = 'user' THEN
      NEW.auto_close_scheduled_at = now() + interval '48 hours';
    END IF;
  END IF;

  -- Wenn Status von resolved zu etwas anderem wechselt
  IF OLD.status = 'resolved' AND NEW.status != 'resolved' THEN
    NEW.resolved_at = NULL;
    NEW.auto_close_scheduled_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_resolved_status_trigger ON support_tickets;

CREATE TRIGGER update_resolved_status_trigger
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_resolved_status();

-- Funktion: Ticket als gelesen markieren
CREATE OR REPLACE FUNCTION mark_ticket_read(ticket_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE support_tickets
  SET
    admin_read_at = now(),
    updated_at = now()
  WHERE id = ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Toggle Favorit
CREATE OR REPLACE FUNCTION toggle_ticket_favorite(ticket_id uuid)
RETURNS boolean AS $$
DECLARE
  new_favorite_status boolean;
BEGIN
  UPDATE support_tickets
  SET
    is_favorite = NOT is_favorite,
    updated_at = now()
  WHERE id = ticket_id
  RETURNING is_favorite INTO new_favorite_status;

  RETURN new_favorite_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Get Tickets für Ordner-System
CREATE OR REPLACE FUNCTION get_tickets_by_folder(folder_name text, admin_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  subject text,
  description text,
  category text,
  priority text,
  status text,
  waiting_for text,
  is_favorite boolean,
  is_recurring boolean,
  created_at timestamptz,
  updated_at timestamptz,
  last_admin_response_at timestamptz,
  admin_read_at timestamptz,
  assigned_to uuid,
  unread_count integer,
  username text,
  user_email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.user_id,
    st.subject,
    st.description,
    st.category,
    st.priority,
    st.status,
    st.waiting_for,
    st.is_favorite,
    st.is_recurring,
    st.created_at,
    st.updated_at,
    st.last_admin_response_at,
    st.admin_read_at,
    st.assigned_to,
    0 as unread_count,
    p.username,
    p.email as user_email
  FROM support_tickets st
  LEFT JOIN profiles p ON p.id = st.user_id
  WHERE
    CASE folder_name
      -- Neue Anfragen: offen + keine Admin-Antwort
      WHEN 'new' THEN
        st.status = 'open'
        AND st.last_admin_response_at IS NULL
        AND (admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = admin_id)

      -- Warte auf mich: Admin muss antworten
      WHEN 'waiting_admin' THEN
        st.waiting_for = 'admin'
        AND st.status NOT IN ('closed', 'resolved')
        AND (admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = admin_id)

      -- Warte auf User: User muss antworten
      WHEN 'waiting_user' THEN
        st.waiting_for = 'user'
        AND st.status NOT IN ('closed')
        AND (admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = admin_id)

      -- Favoriten: markiert + nicht geschlossen
      WHEN 'favorites' THEN
        st.is_favorite = true
        AND st.status != 'closed'
        AND (admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = admin_id)

      -- Geschlossen
      WHEN 'closed' THEN
        st.status = 'closed'
        AND (admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = admin_id)

      -- Alle (default)
      ELSE true
    END
  ORDER BY
    CASE folder_name
      WHEN 'new' THEN st.priority = 'urgent'
      WHEN 'waiting_admin' THEN st.priority = 'urgent'
      ELSE false
    END DESC,
    CASE folder_name
      WHEN 'new' THEN st.created_at
      WHEN 'waiting_admin' THEN COALESCE(
        (SELECT MAX(created_at) FROM ticket_responses WHERE ticket_id = st.id AND is_admin_response = false),
        st.created_at
      )
      WHEN 'waiting_user' THEN st.last_admin_response_at
      WHEN 'favorites' THEN st.updated_at
      WHEN 'closed' THEN st.updated_at
      ELSE st.created_at
    END DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Get Ordner-Statistiken
CREATE OR REPLACE FUNCTION get_folder_stats(admin_id uuid DEFAULT NULL)
RETURNS TABLE (
  new_count integer,
  waiting_admin_count integer,
  waiting_user_count integer,
  favorites_count integer,
  closed_today_count integer,
  urgent_count integer,
  overdue_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Neue Anfragen
    (SELECT COUNT(*)::integer FROM support_tickets
     WHERE status = 'open'
     AND last_admin_response_at IS NULL
     AND (admin_id IS NULL OR assigned_to IS NULL OR assigned_to = admin_id)
    ) as new_count,

    -- Warte auf mich
    (SELECT COUNT(*)::integer FROM support_tickets
     WHERE waiting_for = 'admin'
     AND status NOT IN ('closed', 'resolved')
     AND (admin_id IS NULL OR assigned_to IS NULL OR assigned_to = admin_id)
    ) as waiting_admin_count,

    -- Warte auf User
    (SELECT COUNT(*)::integer FROM support_tickets
     WHERE waiting_for = 'user'
     AND status != 'closed'
     AND (admin_id IS NULL OR assigned_to IS NULL OR assigned_to = admin_id)
    ) as waiting_user_count,

    -- Favoriten
    (SELECT COUNT(*)::integer FROM support_tickets
     WHERE is_favorite = true
     AND status != 'closed'
     AND (admin_id IS NULL OR assigned_to IS NULL OR assigned_to = admin_id)
    ) as favorites_count,

    -- Heute geschlossen
    (SELECT COUNT(*)::integer FROM support_tickets
     WHERE status = 'closed'
     AND DATE(updated_at) = CURRENT_DATE
     AND (admin_id IS NULL OR assigned_to IS NULL OR assigned_to = admin_id)
    ) as closed_today_count,

    -- Dringend (urgent priority)
    (SELECT COUNT(*)::integer FROM support_tickets
     WHERE priority = 'urgent'
     AND status NOT IN ('closed', 'resolved')
     AND (admin_id IS NULL OR assigned_to IS NULL OR assigned_to = admin_id)
    ) as urgent_count,

    -- Überfällig (>4h keine Admin-Antwort bei waiting_admin)
    (SELECT COUNT(*)::integer FROM support_tickets
     WHERE waiting_for = 'admin'
     AND status NOT IN ('closed', 'resolved')
     AND (
       (last_admin_response_at IS NULL AND created_at < now() - interval '4 hours')
       OR (last_admin_response_at IS NOT NULL AND
           EXISTS (
             SELECT 1 FROM ticket_responses
             WHERE ticket_id = support_tickets.id
             AND is_admin_response = false
             AND created_at > support_tickets.last_admin_response_at
             AND created_at < now() - interval '4 hours'
           )
       )
     )
     AND (admin_id IS NULL OR assigned_to IS NULL OR assigned_to = admin_id)
    ) as overdue_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initiale Werte für bestehende Tickets setzen
UPDATE support_tickets
SET
  waiting_for = CASE
    WHEN last_admin_response_at IS NOT NULL THEN 'user'
    ELSE 'admin'
  END,
  is_favorite = false
WHERE waiting_for IS NULL;
