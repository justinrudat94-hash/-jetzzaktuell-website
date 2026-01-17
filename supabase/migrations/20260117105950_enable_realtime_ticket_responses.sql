/*
  # Enable Realtime for ticket_responses

  1. Changes
    - Aktiviere Realtime-Publikation für ticket_responses Tabelle
    - Ermöglicht WebSocket-Updates für neue Nachrichten in Support-Tickets

  2. Sicherheit
    - Respektiert bestehende RLS Policies
    - User sehen nur Updates für ihre eigenen Tickets
*/

-- Enable Realtime für ticket_responses Tabelle
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_responses;
