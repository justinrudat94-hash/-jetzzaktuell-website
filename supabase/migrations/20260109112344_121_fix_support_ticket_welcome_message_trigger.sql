/*
  # Fix Support Ticket Welcome Message Trigger

  1. Problem
    - Der Trigger `create_support_ticket_welcome_message` versucht eine Admin-Nachricht zu erstellen
    - Die RLS Policy blockiert dies, weil sie nur User-Nachrichten erlaubt
    
  2. Lösung
    - Deklariere die Funktion als SECURITY DEFINER
    - Dadurch umgeht die Funktion RLS und kann Admin-Nachrichten erstellen
    
  3. Sicherheit
    - Die Funktion ist sicher, da sie nur beim Erstellen von Tickets ausgeführt wird
    - Sie erstellt nur eine vordefinierte Willkommensnachricht
*/

-- Recreate function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_support_ticket_welcome_message()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO support_messages (ticket_id, sender_id, message, is_admin)
  VALUES (
    NEW.id,
    NEW.user_id,
    'Deine Anfrage wurde empfangen. Wir werden uns schnellstmöglich bei dir melden.',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;