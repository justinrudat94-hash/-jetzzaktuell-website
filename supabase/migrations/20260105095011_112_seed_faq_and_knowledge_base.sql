/*
  # Seed FAQ and Knowledge Base with Starter Data

  This migration adds initial FAQ items and knowledge base entries
  to provide immediate value to users and enable the AI chat to
  answer common questions right away.

  1. FAQ Items (30 entries)
    - Account & Login (8 items)
    - Events (8 items)
    - Premium & Payments (7 items)
    - Tickets & Bookings (7 items)

  2. Knowledge Base Entries (30 entries)
    - Matching FAQ items with optimized patterns
    - High confidence thresholds for common questions
*/

-- Insert FAQ Items for Account & Login
INSERT INTO faq_items (category, question_de, answer_de, tags, priority, is_published) VALUES
('account', 'Wie erstelle ich ein Konto?', 'Tippe auf "Registrieren" in der App, gib deine E-Mail-Adresse und ein sicheres Passwort ein. Du erhältst eine Bestätigungsmail. Klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.', ARRAY['registrierung', 'konto', 'anmeldung'], 10, true),
('account', 'Ich habe mein Passwort vergessen. Was soll ich tun?', 'Klicke auf "Passwort vergessen?" auf der Login-Seite. Gib deine E-Mail-Adresse ein und du erhältst einen Link zum Zurücksetzen deines Passworts.', ARRAY['passwort', 'vergessen', 'zurücksetzen'], 9, true),
('account', 'Wie ändere ich meine E-Mail-Adresse?', 'Gehe zu Profil → Einstellungen → Account-Daten. Dort kannst du deine E-Mail-Adresse ändern. Du musst die neue E-Mail-Adresse bestätigen.', ARRAY['email', 'ändern', 'profil'], 7, true),
('account', 'Kann ich mein Konto löschen?', 'Ja, gehe zu Profil → Einstellungen → Account löschen. Beachte, dass alle deine Daten unwiderruflich gelöscht werden.', ARRAY['konto', 'löschen', 'account'], 6, true),
('account', 'Wie verifiziere ich meine Telefonnummer?', 'Gehe zu Profil → Einstellungen → Telefonnummer verifizieren. Du erhältst einen SMS-Code, den du eingeben musst.', ARRAY['telefon', 'verifizierung', 'sms'], 5, true),
('account', 'Was ist Zwei-Faktor-Authentifizierung?', 'Zwei-Faktor-Authentifizierung (2FA) fügt eine zusätzliche Sicherheitsebene hinzu. Du brauchst neben deinem Passwort auch einen Code von deinem Handy. Aktiviere es unter Profil → Einstellungen → Sicherheit.', ARRAY['2fa', 'sicherheit', 'authentifizierung'], 4, true),
('account', 'Warum kann ich mich nicht einloggen?', 'Überprüfe, ob du die richtige E-Mail und Passwort verwendest. Stelle sicher, dass dein Konto aktiviert ist (check deine E-Mails). Wenn das Problem weiterhin besteht, setze dein Passwort zurück.', ARRAY['login', 'probleme', 'anmeldung'], 8, true),
('account', 'Wie ändere ich mein Profilbild?', 'Tippe auf dein Profil → Bearbeiten → Profilbild ändern. Du kannst ein Foto aufnehmen oder aus deiner Galerie wählen.', ARRAY['profilbild', 'foto', 'avatar'], 5, true);

-- Insert FAQ Items for Events
INSERT INTO faq_items (category, question_de, answer_de, tags, priority, is_published) VALUES
('events', 'Wie erstelle ich ein Event?', 'Tippe auf das "+" Symbol → Event erstellen. Fülle alle erforderlichen Felder aus (Titel, Datum, Ort, Beschreibung) und veröffentliche dein Event.', ARRAY['event', 'erstellen', 'veranstalten'], 10, true),
('events', 'Kann ich mein Event nachträglich bearbeiten?', 'Ja, gehe zu deinem Event → Bearbeiten. Du kannst alle Details ändern, außer das Datum (wenn bereits Tickets verkauft wurden).', ARRAY['bearbeiten', 'ändern', 'event'], 8, true),
('events', 'Wie kann ich mein Event bewerben?', 'Nutze die Boost-Funktion, um dein Event hervorzuheben. Teile es auch auf Social Media über den Share-Button.', ARRAY['boost', 'werbung', 'bewerben'], 7, true),
('events', 'Was kostet es, ein Event zu erstellen?', 'Das Erstellen eines Events ist kostenlos. Du zahlst nur, wenn du Premium-Features wie Boost oder zusätzliche Fotos nutzen möchtest.', ARRAY['kosten', 'preis', 'gebühren'], 9, true),
('events', 'Wie finde ich Events in meiner Nähe?', 'Nutze die Karte oder aktiviere Standortfilter in der Suche. Die App zeigt dir Events basierend auf deiner Position.', ARRAY['suche', 'standort', 'nähe'], 9, true),
('events', 'Kann ich ein Event absagen?', 'Ja, gehe zu deinem Event → Optionen → Event absagen. Alle Teilnehmer werden automatisch benachrichtigt und erhalten ggf. eine Rückerstattung.', ARRAY['absagen', 'stornieren', 'cancel'], 7, true),
('events', 'Wie funktionieren wiederkehrende Events?', 'Bei der Erstellung wähle "Wiederkehrend" und lege das Muster fest (täglich, wöchentlich, monatlich). Das System erstellt automatisch alle Termine.', ARRAY['wiederkehrend', 'serie', 'regelmäßig'], 6, true),
('events', 'Wie viele Fotos kann ich hochladen?', 'Basis-Nutzer: 3 Fotos. Premium-Nutzer: 10 Fotos. Business-Nutzer: 20 Fotos pro Event.', ARRAY['fotos', 'bilder', 'upload'], 5, true);

-- Insert FAQ Items for Premium & Payments
INSERT INTO faq_items (category, question_de, answer_de, tags, priority, is_published) VALUES
('premium', 'Was bietet Premium?', 'Premium bietet: Keine Werbung, mehr Event-Fotos, Event-Boost, erweiterte Statistiken, bevorzugter Support und exklusive Features.', ARRAY['premium', 'features', 'vorteile'], 10, true),
('premium', 'Wie viel kostet Premium?', 'Premium kostet 4,99€/Monat oder 49,99€/Jahr (spare 17%). Die ersten 7 Tage sind kostenlos.', ARRAY['preis', 'kosten', 'abo'], 9, true),
('premium', 'Kann ich Premium kündigen?', 'Ja, jederzeit. Gehe zu Profil → Abonnement verwalten → Kündigen. Du behältst Premium bis zum Ende des bezahlten Zeitraums.', ARRAY['kündigen', 'abo', 'cancel'], 8, true),
('premium', 'Welche Zahlungsmethoden werden akzeptiert?', 'Wir akzeptieren Kreditkarte, PayPal, SEPA-Lastschrift und Google/Apple Pay.', ARRAY['zahlung', 'payment', 'bezahlen'], 7, true),
('premium', 'Kann ich meine Rechnung herunterladen?', 'Ja, gehe zu Profil → Abonnement verwalten → Rechnungen. Dort kannst du alle Rechnungen als PDF herunterladen.', ARRAY['rechnung', 'invoice', 'beleg'], 6, true),
('premium', 'Was ist Business-Premium?', 'Business-Premium ist für Veranstalter und bietet zusätzlich: Unbegrenzte Events, erweiterte Analytics, API-Zugang und Priority-Support. Kosten: 29,99€/Monat.', ARRAY['business', 'veranstalter', 'professional'], 7, true),
('premium', 'Gibt es eine Geld-zurück-Garantie?', 'Ja, wenn du innerhalb der ersten 14 Tage nicht zufrieden bist, erstatten wir dir den vollen Betrag.', ARRAY['rückerstattung', 'geld-zurück', 'garantie'], 6, true);

-- Insert FAQ Items for Tickets & Bookings
INSERT INTO faq_items (category, question_de, answer_de, tags, priority, is_published) VALUES
('tickets', 'Wie kaufe ich ein Ticket?', 'Öffne das Event → Ticket kaufen → Wähle die Anzahl → Bezahle. Du erhältst dein Ticket sofort als QR-Code.', ARRAY['ticket', 'kaufen', 'buchen'], 10, true),
('tickets', 'Wo finde ich meine Tickets?', 'Gehe zu Profil → Meine Tickets. Dort siehst du alle gekauften Tickets mit QR-Codes.', ARRAY['tickets', 'finden', 'anzeigen'], 9, true),
('tickets', 'Kann ich ein Ticket stornieren?', 'Das hängt von den Event-Bedingungen ab. Gehe zu deinem Ticket → Details. Wenn Stornierung erlaubt ist, siehst du dort die Option.', ARRAY['stornieren', 'zurückgeben', 'refund'], 8, true),
('tickets', 'Wie funktioniert der Ticket-Check-in?', 'Zeige deinen QR-Code am Event-Eingang. Der Veranstalter scannt ihn mit unserer App. Der Code kann nur einmal verwendet werden.', ARRAY['checkin', 'einlass', 'qrcode'], 8, true),
('tickets', 'Kann ich Tickets übertragen?', 'Ja, öffne das Ticket → Übertragen → Gib die E-Mail des Empfängers ein. Der neue Besitzer erhält das Ticket in seiner App.', ARRAY['übertragen', 'weitergeben', 'transfer'], 7, true),
('tickets', 'Was passiert, wenn ein Event abgesagt wird?', 'Du wirst automatisch benachrichtigt und erhältst eine vollständige Rückerstattung auf deine Zahlungsmethode innerhalb von 5-7 Werktagen.', ARRAY['absage', 'rückerstattung', 'cancelled'], 8, true),
('tickets', 'Wie verkaufe ich Tickets für mein Event?', 'Als Veranstalter: Erstelle dein Event → Tickets einrichten → Preis und Anzahl festlegen. Wir kümmern uns um Verkauf und Zahlungsabwicklung.', ARRAY['verkaufen', 'veranstalter', 'ticketing'], 7, true);

-- Insert Knowledge Base Entries matching FAQ items
INSERT INTO chat_knowledge_base (question_pattern, answer_template, category, keywords, source, confidence_threshold, priority, language, is_active) VALUES
-- Account & Login
('wie erstelle ich ein konto', 'Um ein Konto zu erstellen, tippe auf "Registrieren", gib deine E-Mail-Adresse und ein sicheres Passwort ein. Du erhältst eine Bestätigungsmail. Klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.', 'account', ARRAY['konto', 'erstellen', 'registrieren', 'anmelden'], 'manual', 0.85, 10, 'de', true),
('passwort vergessen', 'Kein Problem! Klicke auf "Passwort vergessen?" auf der Login-Seite. Gib deine E-Mail-Adresse ein und du erhältst einen Link zum Zurücksetzen deines Passworts.', 'account', ARRAY['passwort', 'vergessen', 'zurücksetzen', 'reset'], 'manual', 0.90, 10, 'de', true),
('email adresse ändern', 'Gehe zu Profil → Einstellungen → Account-Daten. Dort kannst du deine E-Mail-Adresse ändern. Du musst die neue E-Mail-Adresse bestätigen.', 'account', ARRAY['email', 'ändern', 'adresse', 'profil'], 'manual', 0.85, 7, 'de', true),
('konto löschen', 'Du kannst dein Konto unter Profil → Einstellungen → Account löschen. Beachte bitte, dass alle deine Daten unwiderruflich gelöscht werden.', 'account', ARRAY['konto', 'löschen', 'account', 'entfernen'], 'manual', 0.90, 6, 'de', true),
('telefon verifizieren', 'Gehe zu Profil → Einstellungen → Telefonnummer verifizieren. Du erhältst einen SMS-Code, den du eingeben musst.', 'account', ARRAY['telefon', 'verifizieren', 'sms', 'nummer'], 'manual', 0.80, 5, 'de', true),
('zwei faktor authentifizierung', 'Zwei-Faktor-Authentifizierung (2FA) fügt eine zusätzliche Sicherheitsebene hinzu. Aktiviere es unter Profil → Einstellungen → Sicherheit.', 'account', ARRAY['2fa', 'sicherheit', 'authentifizierung', 'schutz'], 'manual', 0.75, 4, 'de', true),
('kann nicht einloggen', 'Überprüfe, ob du die richtige E-Mail und Passwort verwendest. Stelle sicher, dass dein Konto aktiviert ist. Wenn das Problem weiterhin besteht, setze dein Passwort zurück.', 'account', ARRAY['login', 'problem', 'anmelden', 'nicht möglich'], 'manual', 0.80, 8, 'de', true),
('profilbild ändern', 'Tippe auf dein Profil → Bearbeiten → Profilbild ändern. Du kannst ein Foto aufnehmen oder aus deiner Galerie wählen.', 'account', ARRAY['profilbild', 'foto', 'avatar', 'bild'], 'manual', 0.85, 5, 'de', true),

-- Events
('event erstellen', 'Tippe auf das "+" Symbol → Event erstellen. Fülle alle erforderlichen Felder aus (Titel, Datum, Ort, Beschreibung) und veröffentliche dein Event.', 'events', ARRAY['event', 'erstellen', 'veranstalten', 'neu'], 'manual', 0.90, 10, 'de', true),
('event bearbeiten', 'Gehe zu deinem Event → Bearbeiten. Du kannst alle Details ändern, außer das Datum (wenn bereits Tickets verkauft wurden).', 'events', ARRAY['bearbeiten', 'ändern', 'event', 'aktualisieren'], 'manual', 0.85, 8, 'de', true),
('event bewerben', 'Nutze die Boost-Funktion, um dein Event hervorzuheben. Teile es auch auf Social Media über den Share-Button.', 'events', ARRAY['boost', 'werbung', 'bewerben', 'promotion'], 'manual', 0.80, 7, 'de', true),
('event kosten', 'Das Erstellen eines Events ist kostenlos. Du zahlst nur, wenn du Premium-Features wie Boost oder zusätzliche Fotos nutzen möchtest.', 'events', ARRAY['kosten', 'preis', 'gebühren', 'erstellen'], 'manual', 0.85, 9, 'de', true),
('events in der nähe', 'Nutze die Karte oder aktiviere Standortfilter in der Suche. Die App zeigt dir Events basierend auf deiner Position.', 'events', ARRAY['nähe', 'suche', 'standort', 'finden'], 'manual', 0.85, 9, 'de', true),
('event absagen', 'Gehe zu deinem Event → Optionen → Event absagen. Alle Teilnehmer werden automatisch benachrichtigt und erhalten ggf. eine Rückerstattung.', 'events', ARRAY['absagen', 'stornieren', 'cancel', 'löschen'], 'manual', 0.85, 7, 'de', true),
('wiederkehrende events', 'Bei der Erstellung wähle "Wiederkehrend" und lege das Muster fest (täglich, wöchentlich, monatlich). Das System erstellt automatisch alle Termine.', 'events', ARRAY['wiederkehrend', 'serie', 'regelmäßig', 'mehrfach'], 'manual', 0.75, 6, 'de', true),
('fotos hochladen', 'Basis-Nutzer können 3 Fotos hochladen. Premium-Nutzer: 10 Fotos. Business-Nutzer: 20 Fotos pro Event.', 'events', ARRAY['fotos', 'bilder', 'upload', 'hochladen'], 'manual', 0.85, 5, 'de', true),

-- Premium & Payments
('was ist premium', 'Premium bietet: Keine Werbung, mehr Event-Fotos, Event-Boost, erweiterte Statistiken, bevorzugter Support und exklusive Features.', 'premium', ARRAY['premium', 'features', 'vorteile', 'abo'], 'manual', 0.90, 10, 'de', true),
('premium preis', 'Premium kostet 4,99€/Monat oder 49,99€/Jahr (spare 17%). Die ersten 7 Tage sind kostenlos zum Testen.', 'premium', ARRAY['preis', 'kosten', 'premium', 'abo'], 'manual', 0.90, 9, 'de', true),
('premium kündigen', 'Du kannst jederzeit kündigen. Gehe zu Profil → Abonnement verwalten → Kündigen. Du behältst Premium bis zum Ende des bezahlten Zeitraums.', 'premium', ARRAY['kündigen', 'abo', 'beenden', 'cancel'], 'manual', 0.90, 8, 'de', true),
('zahlungsmethoden', 'Wir akzeptieren Kreditkarte, PayPal, SEPA-Lastschrift und Google/Apple Pay.', 'premium', ARRAY['zahlung', 'payment', 'bezahlen', 'methode'], 'manual', 0.85, 7, 'de', true),
('rechnung herunterladen', 'Gehe zu Profil → Abonnement verwalten → Rechnungen. Dort kannst du alle Rechnungen als PDF herunterladen.', 'premium', ARRAY['rechnung', 'invoice', 'beleg', 'pdf'], 'manual', 0.85, 6, 'de', true),
('business premium', 'Business-Premium für Veranstalter: Unbegrenzte Events, erweiterte Analytics, API-Zugang und Priority-Support für 29,99€/Monat.', 'premium', ARRAY['business', 'veranstalter', 'professional', 'pro'], 'manual', 0.80, 7, 'de', true),
('geld zurück garantie', 'Wenn du innerhalb der ersten 14 Tage nicht zufrieden bist, erstatten wir dir den vollen Betrag zurück.', 'premium', ARRAY['rückerstattung', 'geld-zurück', 'garantie', 'refund'], 'manual', 0.80, 6, 'de', true),

-- Tickets & Bookings
('ticket kaufen', 'Öffne das Event → Ticket kaufen → Wähle die Anzahl → Bezahle. Du erhältst dein Ticket sofort als QR-Code.', 'tickets', ARRAY['ticket', 'kaufen', 'buchen', 'bestellen'], 'manual', 0.90, 10, 'de', true),
('tickets finden', 'Gehe zu Profil → Meine Tickets. Dort siehst du alle gekauften Tickets mit QR-Codes.', 'tickets', ARRAY['tickets', 'finden', 'anzeigen', 'wo'], 'manual', 0.90, 9, 'de', true),
('ticket stornieren', 'Das hängt von den Event-Bedingungen ab. Gehe zu deinem Ticket → Details. Wenn Stornierung erlaubt ist, siehst du dort die Option.', 'tickets', ARRAY['stornieren', 'zurückgeben', 'refund', 'rückgabe'], 'manual', 0.85, 8, 'de', true),
('ticket checkin', 'Zeige deinen QR-Code am Event-Eingang. Der Veranstalter scannt ihn. Der Code kann nur einmal verwendet werden.', 'tickets', ARRAY['checkin', 'einlass', 'qrcode', 'scannen'], 'manual', 0.85, 8, 'de', true),
('ticket übertragen', 'Öffne das Ticket → Übertragen → Gib die E-Mail des Empfängers ein. Der neue Besitzer erhält das Ticket in seiner App.', 'tickets', ARRAY['übertragen', 'weitergeben', 'transfer', 'verschenken'], 'manual', 0.80, 7, 'de', true),
('event abgesagt', 'Du wirst automatisch benachrichtigt und erhältst eine vollständige Rückerstattung innerhalb von 5-7 Werktagen.', 'tickets', ARRAY['absage', 'rückerstattung', 'cancelled', 'storniert'], 'manual', 0.85, 8, 'de', true),
('tickets verkaufen', 'Als Veranstalter: Erstelle dein Event → Tickets einrichten → Preis und Anzahl festlegen. Wir kümmern uns um Verkauf und Zahlungsabwicklung.', 'tickets', ARRAY['verkaufen', 'veranstalter', 'ticketing', 'anbieten'], 'manual', 0.80, 7, 'de', true);
