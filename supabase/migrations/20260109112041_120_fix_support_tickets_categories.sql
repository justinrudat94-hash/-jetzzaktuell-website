/*
  # Fix Support Tickets Categories

  1. Changes
    - Erweitert die erlaubten Kategorien für Support-Tickets
    - Fügt neue Kategorien hinzu: events, tickets, premium, moderation, general
    - Entfernt den alten Check Constraint und erstellt einen neuen mit allen Kategorien
  
  2. Erlaubte Kategorien nach Migration:
    - technical (Technisches Problem)
    - account (Account & Profil)
    - events (Events)
    - tickets (Tickets)
    - coins (Coins & Zahlung)
    - premium (Premium)
    - livestream (Livestream)
    - moderation (Meldung)
    - general (Sonstiges/General)
    - other (Sonstiges - legacy)
*/

-- Drop old constraint
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;

-- Add new constraint with all categories
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_category_check 
CHECK (category IN (
  'technical', 
  'account', 
  'events', 
  'tickets', 
  'coins', 
  'premium', 
  'livestream', 
  'moderation', 
  'general',
  'other'
));