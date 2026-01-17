/*
  # Rechtssichere Umformulierung aller FAQ-Einträge

  ## Änderungen
  
  Diese Migration entfernt alle rechtlich problematischen Zusagen aus den FAQs
  und ersetzt sie durch flexible Formulierungen mit Prüfungsvorbehalten.
  
  ## Hauptänderungen
  
  1. **GELÖSCHT: Geld-zurück-Garantie FAQ**
     - Komplett entfernt, da keine solche Garantie existiert
  
  2. **Event-Absagen & Rückerstattungen**
     - Von "vollständige Rückerstattung innerhalb von 5-7 Werktagen"
     - Zu "nach individueller Prüfung durch das JETZZ-Team"
  
  3. **Ticket-Stornierungen**
     - Von "hängt von den Event-Bedingungen ab"
     - Zu "werden individuell vom JETZZ-Team geprüft"
  
  4. **Premium-Testphase**
     - Von "Die ersten 7 Tage sind kostenlos"
     - Zu "Testphase gemäß unseren AGB verfügbar"
  
  5. **Zahlungsmethoden**
     - Ergänzt mit "können variieren" und "gemäß aktueller Verfügbarkeit"
  
  6. **Allgemeine Vorbehalte**
     - Alle kritischen Themen verweisen nun auf AGB
     - Prüfungsvorbehalt durch das Team eingefügt
     - Konkrete Fristen entfernt
  
  ## Rechtssicherheit
  
  Diese Änderungen schützen JETZZ vor:
  - Unbegründeten Rückerstattungsansprüchen
  - Verbindlichen Zusagen ohne Prüfung
  - Haftung bei Veranstalter-Problemen
  - Garantieansprüchen ohne rechtliche Grundlage
*/

-- 1. LÖSCHEN: Geld-zurück-Garantie FAQ (existiert nicht wirklich)
DELETE FROM faq_items 
WHERE question_de = 'Gibt es eine Geld-zurück-Garantie?';

DELETE FROM chat_knowledge_base 
WHERE question_pattern = 'geld zurück garantie';

-- 2. UPDATE: Event absagen - Rückerstattung nur nach Prüfung
UPDATE faq_items 
SET answer_de = 'Ja, gehe zu deinem Event → Optionen → Event absagen. Alle Teilnehmer werden automatisch benachrichtigt. Rückerstattungen werden nach individueller Prüfung durch das JETZZ-Team bearbeitet, gemäß unseren AGB.'
WHERE question_de = 'Kann ich ein Event absagen?';

UPDATE chat_knowledge_base 
SET answer_template = 'Gehe zu deinem Event → Optionen → Event absagen. Alle Teilnehmer werden automatisch benachrichtigt. Rückerstattungen werden nach individueller Prüfung durch das JETZZ-Team bearbeitet.'
WHERE question_pattern = 'event absagen';

-- 3. UPDATE: Event abgesagt - keine konkreten Fristen
UPDATE faq_items 
SET answer_de = 'Du wirst automatisch benachrichtigt. Rückerstattungen werden nach Prüfung durch das JETZZ-Team bearbeitet. Details findest du in unseren AGB.'
WHERE question_de = 'Was passiert, wenn ein Event abgesagt wird?';

UPDATE chat_knowledge_base 
SET answer_template = 'Du wirst automatisch benachrichtigt. Rückerstattungen werden nach Prüfung durch das JETZZ-Team bearbeitet. Details findest du in unseren AGB.'
WHERE question_pattern = 'event abgesagt';

-- 4. UPDATE: Ticket stornieren - Team prüft individuell
UPDATE faq_items 
SET answer_de = 'Stornierungen werden individuell vom JETZZ-Team geprüft. Gehe zu deinem Ticket → Details → Stornierung anfragen. Das Team meldet sich bei dir zurück.'
WHERE question_de = 'Kann ich ein Ticket stornieren?';

UPDATE chat_knowledge_base 
SET answer_template = 'Stornierungen werden individuell vom JETZZ-Team geprüft. Gehe zu deinem Ticket → Details → Stornierung anfragen. Wir melden uns bei dir.'
WHERE question_pattern = 'ticket stornieren';

-- 5. UPDATE: Premium Preis - keine Garantie für kostenlose Testphase
UPDATE faq_items 
SET answer_de = 'Premium kostet aktuell 4,99€/Monat oder 49,99€/Jahr. Eine Testphase kann gemäß unseren AGB verfügbar sein.'
WHERE question_de = 'Wie viel kostet Premium?';

UPDATE chat_knowledge_base 
SET answer_template = 'Premium kostet aktuell 4,99€/Monat oder 49,99€/Jahr. Details und eventuelle Testoptionen findest du in unseren AGB.'
WHERE question_pattern = 'premium preis';

-- 6. UPDATE: Premium kündigen - Verweis auf AGB
UPDATE faq_items 
SET answer_de = 'Ja, jederzeit gemäß unseren AGB. Gehe zu Profil → Abonnement verwalten → Kündigen. Details zur Kündigungsfrist findest du in den AGB.'
WHERE question_de = 'Kann ich Premium kündigen?';

UPDATE chat_knowledge_base 
SET answer_template = 'Du kannst jederzeit gemäß unseren AGB kündigen. Gehe zu Profil → Abonnement verwalten → Kündigen. Details in den AGB.'
WHERE question_pattern = 'premium kündigen';

-- 7. UPDATE: Zahlungsmethoden - mit Vorbehalt
UPDATE faq_items 
SET answer_de = 'Wir akzeptieren aktuell Kreditkarte, PayPal, SEPA-Lastschrift und Google/Apple Pay. Verfügbare Zahlungsmethoden können je nach Region variieren.'
WHERE question_de = 'Welche Zahlungsmethoden werden akzeptiert?';

UPDATE chat_knowledge_base 
SET answer_template = 'Aktuell verfügbar: Kreditkarte, PayPal, SEPA-Lastschrift und Google/Apple Pay. Die Verfügbarkeit kann je nach Region variieren.'
WHERE question_pattern = 'zahlungsmethoden';

-- 8. UPDATE: Business Premium - Preise als "aktuell" kennzeichnen
UPDATE faq_items 
SET answer_de = 'Business-Premium ist für Veranstalter und bietet zusätzlich: Unbegrenzte Events, erweiterte Analytics, API-Zugang und Priority-Support. Aktuelle Preise und Details findest du in unseren AGB.'
WHERE question_de = 'Was ist Business-Premium?';

UPDATE chat_knowledge_base 
SET answer_template = 'Business-Premium für Veranstalter: Unbegrenzte Events, erweiterte Analytics, API-Zugang und Priority-Support. Details in unseren AGB.'
WHERE question_pattern = 'business premium';

-- 9. UPDATE: Event Kosten - flexibler formuliert
UPDATE faq_items 
SET answer_de = 'Das Erstellen von Events ist grundsätzlich kostenlos. Kosten können bei Nutzung von Premium-Features wie Boost anfallen. Details in unseren AGB.'
WHERE question_de = 'Was kostet es, ein Event zu erstellen?';

UPDATE chat_knowledge_base 
SET answer_template = 'Das Erstellen von Events ist grundsätzlich kostenlos. Premium-Features wie Boost können kostenpflichtig sein. Details in unseren AGB.'
WHERE question_pattern = 'event kosten';

-- 10. UPDATE: Tickets verkaufen - mit Verweis auf Bedingungen
UPDATE faq_items 
SET answer_de = 'Als Veranstalter: Erstelle dein Event → Tickets einrichten → Preis und Anzahl festlegen. Gebühren und Details zur Abwicklung findest du in unseren AGB.'
WHERE question_de = 'Wie verkaufe ich Tickets für mein Event?';

UPDATE chat_knowledge_base 
SET answer_template = 'Als Veranstalter: Event erstellen → Tickets einrichten → Preis und Anzahl festlegen. Details zur Abwicklung und Gebühren in den AGB.'
WHERE question_pattern = 'tickets verkaufen';

-- 11. UPDATE: Account löschen - rechtssicherer
UPDATE faq_items 
SET answer_de = 'Ja, gehe zu Profil → Einstellungen → Account löschen. Beachte, dass alle deine Daten gemäß DSGVO unwiderruflich gelöscht werden. Details in unserer Datenschutzerklärung.'
WHERE question_de = 'Kann ich mein Konto löschen?';

UPDATE chat_knowledge_base 
SET answer_template = 'Du kannst dein Konto unter Profil → Einstellungen → Account löschen. Alle Daten werden unwiderruflich gelöscht. Details in der Datenschutzerklärung.'
WHERE question_pattern = 'konto löschen';

-- 12. UPDATE: Event bearbeiten nachträglich - klarere Einschränkungen
UPDATE faq_items 
SET answer_de = 'Ja, gehe zu deinem Event → Bearbeiten. Bestimmte Änderungen können eingeschränkt sein, wenn bereits Tickets verkauft wurden. Bei Fragen kontaktiere den Support.'
WHERE question_de = 'Kann ich mein Event nachträglich bearbeiten?';

UPDATE chat_knowledge_base 
SET answer_template = 'Gehe zu deinem Event → Bearbeiten. Einige Änderungen können bei verkauften Tickets eingeschränkt sein. Bei Fragen kontaktiere unseren Support.'
WHERE question_pattern = 'event bearbeiten';

-- 13. UPDATE: Fotos hochladen - als "aktuell" kennzeichnen
UPDATE faq_items 
SET answer_de = 'Aktuell gilt: Basis-Nutzer: 3 Fotos. Premium-Nutzer: 10 Fotos. Business-Nutzer: 20 Fotos pro Event. Limits können sich ändern.'
WHERE question_de = 'Wie viele Fotos kann ich hochladen?';

UPDATE chat_knowledge_base 
SET answer_template = 'Aktuell: Basis-Nutzer können 3 Fotos hochladen. Premium: 10 Fotos. Business: 20 Fotos pro Event.'
WHERE question_pattern = 'fotos hochladen';
