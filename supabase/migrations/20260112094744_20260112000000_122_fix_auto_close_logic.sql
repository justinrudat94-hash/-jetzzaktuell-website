/*
  # Fix Auto-Close-Logik für Support-Tickets

  1. Problem
    - Tickets werden automatisch geschlossen auch wenn Support NICHT geantwortet hat
    - Kunden-Antworten setzen Auto-Close nicht zurück
    - Geschlossene Tickets werden nicht automatisch wieder geöffnet bei Kunden-Antwort

  2. Lösung
    - Auto-Close nur setzen wenn Admin geantwortet hat (last_admin_reply_at ist nicht NULL)
    - 48h-Frist läuft ab letzter Admin-Antwort, nicht ab Status-Änderung
    - Kunden-Antworten setzen auto_close_scheduled_at auf NULL
    - Kunden-Antworten öffnen geschlossene Tickets automatisch

  3. Änderungen
    - track_successful_resolution() Trigger überarbeitet
    - update_reply_timestamps() Trigger erweitert
*/

-- Überschreibe track_successful_resolution Trigger
-- Auto-Close nur setzen wenn Admin geantwortet hat
CREATE OR REPLACE FUNCTION track_successful_resolution()
RETURNS TRIGGER AS $$
DECLARE
  resolution_time_hours float;
  recurring_record recurring_issues%ROWTYPE;
  has_admin_reply boolean;
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

    -- Auto-Close nur setzen wenn Status auf "resolved" UND Admin geantwortet hat
    IF NEW.status = 'resolved' THEN
      -- Prüfe ob Admin geantwortet hat
      has_admin_reply := NEW.last_admin_reply_at IS NOT NULL;

      IF has_admin_reply THEN
        -- Setze Auto-Close auf 48h nach letzter Admin-Antwort
        NEW.auto_close_scheduled_at = NEW.last_admin_reply_at + interval '48 hours';
      ELSE
        -- Kein Admin-Reply = kein Auto-Close
        NEW.auto_close_scheduled_at = NULL;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Erweitere update_reply_timestamps Trigger
-- Bei Kunden-Antwort: Auto-Close zurücksetzen und geschlossene Tickets wieder öffnen
CREATE OR REPLACE FUNCTION update_reply_timestamps()
RETURNS TRIGGER AS $$
DECLARE
  current_ticket_status text;
BEGIN
  -- Hole aktuellen Ticket-Status
  SELECT status INTO current_ticket_status
  FROM support_tickets
  WHERE id = NEW.ticket_id;

  IF NEW.is_admin_response THEN
    -- Admin antwortet
    UPDATE support_tickets
    SET
      last_admin_reply_at = now(),
      -- Bei Admin-Antwort auf resolved Ticket: Neuen Auto-Close Zeitstempel setzen
      auto_close_scheduled_at = CASE
        WHEN status = 'resolved' THEN now() + interval '48 hours'
        ELSE auto_close_scheduled_at
      END
    WHERE id = NEW.ticket_id;
  ELSE
    -- Kunde antwortet
    UPDATE support_tickets
    SET
      last_customer_reply_at = now(),
      -- Auto-Close zurücksetzen
      auto_close_scheduled_at = NULL,
      -- Geschlossene Tickets automatisch wieder öffnen
      status = CASE
        WHEN status = 'closed' THEN 'open'
        ELSE status
      END,
      -- Reopened Counter erhöhen wenn Ticket geschlossen war
      reopened_count = CASE
        WHEN status = 'closed' THEN COALESCE(reopened_count, 0) + 1
        ELSE reopened_count
      END
    WHERE id = NEW.ticket_id;

    -- Wenn Ticket geschlossen war, Log-Nachricht hinzufügen
    IF current_ticket_status = 'closed' THEN
      INSERT INTO ticket_responses (ticket_id, user_id, is_admin_response, message)
      VALUES (
        NEW.ticket_id,
        NEW.user_id,
        true,
        'Ticket wurde automatisch wieder geöffnet, da der Kunde geantwortet hat.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;