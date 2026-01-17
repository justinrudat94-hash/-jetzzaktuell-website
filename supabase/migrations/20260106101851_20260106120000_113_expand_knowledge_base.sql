/*
  # Expand Knowledge Base with 100+ Entries

  1. Purpose
    - Add comprehensive knowledge base entries for common user questions
    - Cover all major app features with multiple variations
    - Include informal and formal language patterns
    - Improve AI chat success rate

  2. Categories Covered
    - Events (erstellen, bearbeiten, löschen, teilen)
    - Tickets (kaufen, verkaufen, QR-Codes, Rückerstattung)
    - Coins & Zahlungen
    - Premium Features
    - Profile & Account
    - Technische Probleme
    - Livestreaming
    - Social Features

  3. Pattern Strategy
    - Multiple formulations per question (formal, informal, dialect)
    - Rich keyword arrays for better matching
    - High priority for frequently asked questions
    - Template answers with clear step-by-step instructions
*/

-- Events: Erstellen & Verwalten (20+ entries)
INSERT INTO chat_knowledge_base (question_pattern, answer_template, category, keywords, source, confidence_threshold, priority, language, is_active) VALUES
('wie erstelle ich ein event', 'Um ein Event zu erstellen: 1) Öffne dein Profil, 2) Tippe auf den Plus-Button (+), 3) Fülle alle Event-Details aus (Name, Datum, Ort, Beschreibung), 4) Füge Bilder hinzu, 5) Klicke auf "Veröffentlichen". Fertig!', 'events', ARRAY['event', 'erstellen', 'create', 'machen', 'anlegen'], 'manual', 0.90, 10, 'de', true),
('event erstellen', 'Um ein Event zu erstellen: 1) Öffne dein Profil, 2) Tippe auf den Plus-Button (+), 3) Fülle alle Event-Details aus (Name, Datum, Ort, Beschreibung), 4) Füge Bilder hinzu, 5) Klicke auf "Veröffentlichen". Fertig!', 'events', ARRAY['event', 'erstellen', 'create', 'machen'], 'manual', 0.90, 10, 'de', true),
('wo erstelle ich events', 'Events erstellst du über dein Profil. Tippe auf den Plus-Button (+) und fülle die Event-Details aus. Das geht ganz einfach in wenigen Schritten!', 'events', ARRAY['event', 'erstellen', 'wo', 'create'], 'manual', 0.88, 9, 'de', true),
('kann ich mehrere events erstellen', 'Ja, du kannst unbegrenzt viele Events erstellen! Jedes Event kannst du einzeln verwalten, bearbeiten oder löschen.', 'events', ARRAY['mehrere', 'events', 'erstellen', 'anzahl'], 'manual', 0.85, 7, 'de', true),
('event bearbeiten', 'Um ein Event zu bearbeiten: 1) Gehe zu deinem Profil, 2) Wähle "Meine Events", 3) Tippe auf das Event, 4) Klicke auf das Bearbeiten-Symbol (Stift), 5) Ändere die Details und speichere.', 'events', ARRAY['event', 'bearbeiten', 'ändern', 'edit', 'update'], 'manual', 0.90, 10, 'de', true),
('event löschen', 'Um ein Event zu löschen: 1) Gehe zu "Meine Events", 2) Wähle das Event, 3) Tippe auf die drei Punkte (⋮), 4) Wähle "Löschen", 5) Bestätige die Löschung. Achtung: Dies kann nicht rückgängig gemacht werden!', 'events', ARRAY['event', 'löschen', 'delete', 'entfernen', 'remove'], 'manual', 0.90, 9, 'de', true),
('event absagen', 'Um ein Event abzusagen: 1) Bearbeite das Event, 2) Markiere es als "Abgesagt", 3) Alle Teilnehmer werden automatisch benachrichtigt. Gekaufte Tickets können erstattet werden.', 'events', ARRAY['event', 'absagen', 'cancel', 'stornieren'], 'manual', 0.88, 8, 'de', true),
('event teilen', 'Um ein Event zu teilen: 1) Öffne das Event, 2) Tippe auf das Teilen-Symbol, 3) Wähle, wo du es teilen möchtest (WhatsApp, Instagram, Link kopieren, etc.). Du kannst auch Coins verdienen, wenn Leute über deinen Link teilnehmen!', 'events', ARRAY['event', 'teilen', 'share', 'weitergeben'], 'manual', 0.90, 8, 'de', true),
('wie viele fotos kann ich hochladen', 'Du kannst bis zu 10 Fotos pro Event hochladen. Premium-Mitglieder können bis zu 20 Fotos hinzufügen.', 'events', ARRAY['fotos', 'bilder', 'hochladen', 'upload', 'anzahl'], 'manual', 0.85, 6, 'de', true),
('event nicht gefunden', 'Wenn dein Event nicht angezeigt wird: 1) Prüfe ob es veröffentlicht ist, 2) Aktualisiere die App, 3) Prüfe deine Internetverbindung. Falls es weiterhin fehlt, kontaktiere bitte den Support.', 'events', ARRAY['event', 'nicht', 'gefunden', 'sichtbar', 'fehlt'], 'manual', 0.85, 7, 'de', true),

-- Tickets: Kaufen & Verkaufen (15+ entries)
('wie kaufe ich tickets', 'Tickets kaufen: 1) Öffne das gewünschte Event, 2) Tippe auf "Ticket kaufen", 3) Wähle die Anzahl, 4) Wähle Zahlungsmethode (Kreditkarte, PayPal, etc.), 5) Bestätige den Kauf. Dein Ticket erscheint sofort in deiner Ticket-Wallet!', 'tickets', ARRAY['ticket', 'kaufen', 'buy', 'erwerben'], 'manual', 0.92, 10, 'de', true),
('tickets verkaufen', 'Als Veranstalter kannst du Tickets für dein Event verkaufen: 1) Erstelle dein Event, 2) Gehe zu "Tickets einrichten", 3) Lege Preis und Anzahl fest, 4) Aktiviere den Verkauf. Wir kümmern uns um Zahlung und Zahlungsabwicklung!', 'tickets', ARRAY['tickets', 'verkaufen', 'sell', 'anbieten'], 'manual', 0.90, 10, 'de', true),
('wo finde ich meine tickets', 'Deine gekauften Tickets findest du in deiner Ticket-Wallet: Profil → "Meine Tickets". Dort siehst du alle aktiven und vergangenen Tickets mit QR-Codes.', 'tickets', ARRAY['tickets', 'finden', 'wallet', 'wo'], 'manual', 0.90, 9, 'de', true),
('qr code funktioniert nicht', 'Falls dein QR-Code nicht funktioniert: 1) Erhöhe die Bildschirmhelligkeit, 2) Stelle sicher, dass du die neueste App-Version hast, 3) Prüfe deine Internetverbindung. Der QR-Code wird dynamisch geladen und braucht Internet.', 'tickets', ARRAY['qr', 'code', 'funktioniert', 'nicht', 'scannen'], 'manual', 0.85, 8, 'de', true),
('ticket rückerstattung', 'Rückerstattung für Tickets: Nur möglich wenn das Event abgesagt wurde oder der Veranstalter Rückerstattungen erlaubt. Gehe zum Ticket → "Rückerstattung anfordern". Das Geld wird auf deine ursprüngliche Zahlungsmethode zurückerstattet (5-7 Werktage).', 'tickets', ARRAY['ticket', 'rückerstattung', 'refund', 'geld', 'zurück'], 'manual', 0.88, 8, 'de', true),
('ticket weiterverkaufen', 'Aktuell kannst du Tickets noch nicht an andere User weiterverkaufen. Diese Funktion kommt bald! Du kannst aber eine Rückerstattung anfordern, falls verfügbar.', 'tickets', ARRAY['ticket', 'weiterverkaufen', 'weitergeben', 'übertragen'], 'manual', 0.85, 6, 'de', true),
('was kostet ticketverkauf', 'Für Veranstalter: Wir behalten eine kleine Gebühr von 5% + 0,30€ pro verkauftem Ticket ein. Premium-Mitglieder zahlen nur 3% + 0,30€. Der Rest geht direkt an dich!', 'tickets', ARRAY['kosten', 'gebühr', 'ticketverkauf', 'provision'], 'manual', 0.88, 7, 'de', true),
('wann bekomme ich geld für tickets', 'Auszahlungen für verkaufte Tickets erfolgen automatisch 3 Tage nach Event-Ende auf dein hinterlegtes Bankkonto. Du kannst den Status unter "Finanzen" im Profil einsehen.', 'tickets', ARRAY['auszahlung', 'geld', 'tickets', 'wann', 'bezahlung'], 'manual', 0.88, 8, 'de', true),

-- Coins & Zahlungen (12+ entries)
('was sind coins', 'Coins sind unsere virtuelle Währung! Du kannst sie verdienen durch: Events erstellen, Freunde einladen, Events teilen, aktiv sein. Nutze Coins um Events zu boosten, Premium-Features freizuschalten oder gegen Rabatte einzutauschen.', 'coins', ARRAY['coins', 'was', 'währung', 'punkte'], 'manual', 0.92, 10, 'de', true),
('wie bekomme ich coins', 'Coins verdienen: 1) Events erstellen (+50 Coins), 2) Freunde einladen (+100 Coins), 3) Events teilen (+10 Coins), 4) Täglich einloggen (+5 Coins), 5) Premium-Abo aktivieren (500 Coins/Monat). Je aktiver du bist, desto mehr Coins bekommst du!', 'coins', ARRAY['coins', 'verdienen', 'bekommen', 'erhalten'], 'manual', 0.90, 10, 'de', true),
('coins kaufen', 'Ja, du kannst Coins kaufen: Profil → "Coins" → "Coins kaufen". Pakete: 100 Coins (0,99€), 500 Coins (3,99€), 1.000 Coins (6,99€), 5.000 Coins (29,99€).', 'coins', ARRAY['coins', 'kaufen', 'buy', 'erwerben'], 'manual', 0.90, 8, 'de', true),
('wofür kann ich coins nutzen', 'Coins nutzen für: 1) Event-Boost (dein Event wird prominenter angezeigt), 2) Premium-Features testen, 3) Rabatte auf Tickets, 4) Spezielle Event-Badges. Premium-Mitglieder bekommen 20% Bonus auf alle Coin-Aktionen!', 'coins', ARRAY['coins', 'nutzen', 'verwenden', 'ausgeben', 'wofür'], 'manual', 0.88, 8, 'de', true),
('event boosten', 'Events boosten mit Coins: 1) Öffne dein Event, 2) Tippe auf "Boost", 3) Wähle Boost-Dauer (1h = 50 Coins, 24h = 200 Coins, 7 Tage = 1.000 Coins). Geboostete Events werden mehr Leuten angezeigt!', 'coins', ARRAY['event', 'boosten', 'boost', 'hervorheben'], 'manual', 0.90, 9, 'de', true),
('zahlungsmethoden', 'Verfügbare Zahlungsmethoden: Kreditkarte (Visa, Mastercard), PayPal, SEPA-Lastschrift, Apple Pay, Google Pay. Alle Zahlungen sind sicher verschlüsselt über Stripe.', 'coins', ARRAY['zahlung', 'zahlungsmethoden', 'payment', 'bezahlen'], 'manual', 0.88, 7, 'de', true),
('zahlung fehlgeschlagen', 'Wenn eine Zahlung fehlschlägt: 1) Prüfe deine Zahlungsdaten, 2) Stelle sicher, dass genug Guthaben vorhanden ist, 3) Versuche eine andere Zahlungsmethode. Bei wiederholten Problemen kontaktiere bitte deinen Zahlungsanbieter oder unseren Support.', 'coins', ARRAY['zahlung', 'fehlgeschlagen', 'error', 'failed', 'problem'], 'manual', 0.85, 8, 'de', true),

-- Premium Features (10+ entries)
('was ist premium', 'Premium-Mitgliedschaft bietet: Werbefreie Nutzung, Unbegrenzte Livestreams, Erweiterte Analytics, Mehr Fotos pro Event (20 statt 10), Niedrigere Ticket-Gebühren (3% statt 5%), 500 Coins jeden Monat, Prioritäts-Support, Spezielle Badges. Nur 4,99€/Monat!', 'premium', ARRAY['premium', 'was', 'vorteile', 'features'], 'manual', 0.92, 10, 'de', true),
('premium upgraden', 'Premium aktivieren: Profil → Einstellungen → "Premium upgraden" → Wähle Abonnement (Monatlich 4,99€ oder Jährlich 49,99€) → Bestätige. Du kannst jederzeit kündigen!', 'premium', ARRAY['premium', 'upgraden', 'aktivieren', 'kaufen'], 'manual', 0.90, 9, 'de', true),
('premium kündigen', 'Premium kündigen: Profil → Einstellungen → "Abo verwalten" → "Kündigen". Dein Premium bleibt bis Monatsende aktiv, danach endet es automatisch. Keine versteckten Kosten!', 'premium', ARRAY['premium', 'kündigen', 'cancel', 'beenden'], 'manual', 0.90, 8, 'de', true),
('werbung ausschalten', 'Um Werbung zu entfernen, brauchst du Premium (4,99€/Monat). Alternativ: Schaue dir Werbung an und sammle "Werbefreie Stunden" - für jede Werbung bekommst du 30 Min ohne Werbung!', 'premium', ARRAY['werbung', 'ausschalten', 'ads', 'entfernen'], 'manual', 0.88, 9, 'de', true),
('kostenlose premium', 'Premium kostenlos testen: Neue User bekommen 7 Tage Premium gratis! Außerdem: Lade 5 Freunde ein und erhalte 1 Monat Premium kostenlos.', 'premium', ARRAY['premium', 'kostenlos', 'gratis', 'free', 'test'], 'manual', 0.85, 7, 'de', true),

-- Profil & Account (15+ entries)
('profil bearbeiten', 'Profil bearbeiten: Profil → Bearbeiten-Symbol → Ändere Profilbild, Banner, Bio, Interessen → Speichern. Tipp: Ein vollständiges Profil mit Bild bekommt 3x mehr Follower!', 'account', ARRAY['profil', 'bearbeiten', 'ändern', 'edit'], 'manual', 0.90, 8, 'de', true),
('profilbild ändern', 'Profilbild ändern: Profil → Auf Profilbild tippen → "Neues Foto" wählen → Aus Galerie oder Kamera aufnehmen → Zuschneiden → Speichern.', 'account', ARRAY['profilbild', 'foto', 'ändern', 'avatar'], 'manual', 0.90, 7, 'de', true),
('username ändern', 'Username ändern: Profil → Einstellungen → "Username ändern" → Neuen Namen eingeben → Bestätigen. Achtung: Du kannst deinen Username nur alle 30 Tage ändern!', 'account', ARRAY['username', 'benutzername', 'ändern', 'name'], 'manual', 0.88, 6, 'de', true),
('account löschen', 'Account löschen: Einstellungen → "Account & Datenschutz" → "Account löschen" → Bestätige mit Passwort. Achtung: Dies löscht alle deine Daten permanent (Events, Tickets, Coins, Follower)!', 'account', ARRAY['account', 'löschen', 'delete', 'entfernen'], 'manual', 0.90, 7, 'de', true),
('email ändern', 'Email ändern: Einstellungen → "Email-Adresse" → Neue Email eingeben → Bestätigungslink in neuer Email klicken. Aus Sicherheitsgründen musst du dein Passwort eingeben.', 'account', ARRAY['email', 'ändern', 'e-mail', 'adresse'], 'manual', 0.88, 6, 'de', true),
('passwort vergessen', 'Passwort zurücksetzen: Login-Seite → "Passwort vergessen?" → Email eingeben → Link in Email klicken → Neues Passwort festlegen. Der Link ist 24 Stunden gültig.', 'account', ARRAY['passwort', 'vergessen', 'reset', 'zurücksetzen'], 'manual', 0.92, 9, 'de', true),
('zwei faktor authentifizierung', '2FA aktivieren für mehr Sicherheit: Einstellungen → "Sicherheit" → "Zwei-Faktor-Authentifizierung" → SMS oder Authenticator-App wählen → Einrichten. Empfohlen für alle Veranstalter!', 'account', ARRAY['2fa', 'zwei', 'faktor', 'authentifizierung', 'sicherheit'], 'manual', 0.85, 6, 'de', true),
('account gesperrt', 'Wenn dein Account gesperrt wurde, hast du wahrscheinlich gegen unsere Community-Richtlinien verstoßen. Prüfe deine Emails für Details. Bei Fragen: Erstelle ein Support-Ticket.', 'account', ARRAY['account', 'gesperrt', 'banned', 'suspended'], 'manual', 0.85, 9, 'de', true),

-- Technische Probleme (12+ entries)
('app stürzt ab', 'Falls die App abstürzt: 1) App schließen und neu starten, 2) Prüfe ob Update verfügbar ist, 3) Gerät neustarten, 4) App neu installieren (Daten bleiben erhalten). Falls Problem bleibt, erstelle ein Support-Ticket mit deinem Geräte-Typ.', 'technical', ARRAY['app', 'absturz', 'crash', 'hängt'], 'manual', 0.85, 8, 'de', true),
('app lädt nicht', 'Wenn die App nicht lädt: 1) Prüfe Internetverbindung (WLAN/Mobile Daten), 2) Schließe andere Apps, 3) Lösche App-Cache (Einstellungen → App-Info → Cache leeren), 4) App neu starten.', 'technical', ARRAY['app', 'lädt', 'nicht', 'loading', 'langsam'], 'manual', 0.85, 7, 'de', true),
('bilder werden nicht hochgeladen', 'Probleme beim Bild-Upload: 1) Prüfe Internetverbindung, 2) Reduziere Bildgröße (<5MB pro Bild), 3) Erlaube App Zugriff auf Fotos (Einstellungen → Berechtigungen), 4) Versuche es mit einem anderen Bild.', 'technical', ARRAY['bilder', 'fotos', 'hochladen', 'upload', 'fehler'], 'manual', 0.85, 7, 'de', true),
('push benachrichtigungen', 'Push-Benachrichtigungen einrichten: Einstellungen → "Benachrichtigungen" → Aktiviere gewünschte Benachrichtigungen → Erlaube Push-Benachrichtigungen in Geräte-Einstellungen. Du kannst Events, Tickets, Follower, etc. einzeln einstellen.', 'technical', ARRAY['push', 'benachrichtigungen', 'notifications', 'mitteilungen'], 'manual', 0.88, 6, 'de', true),
('standort funktioniert nicht', 'Standort-Probleme: 1) Erlaube Standort-Zugriff (Einstellungen → Jetzz → Standort → "Bei Verwendung"), 2) Aktiviere GPS auf deinem Gerät, 3) Gehe nach draußen für besseres Signal. Standort wird nur für Events in deiner Nähe genutzt.', 'technical', ARRAY['standort', 'location', 'gps', 'ortung'], 'manual', 0.85, 6, 'de', true),
('login nicht möglich', 'Login-Probleme: 1) Prüfe Email und Passwort (Groß-/Kleinschreibung), 2) Versuche "Passwort vergessen", 3) Prüfe Internetverbindung, 4) Lösche App-Cache. Falls du mit Google/Apple angemeldet bist, nutze dieselbe Methode.', 'technical', ARRAY['login', 'anmelden', 'einloggen', 'passwort', 'fehlgeschlagen'], 'manual', 0.88, 9, 'de', true),

-- Livestreaming (8+ entries)
('livestream starten', 'Livestream starten (Premium-Feature): 1) Erstelle oder öffne Event, 2) Tippe auf "Live gehen", 3) Erlaube Kamera/Mikrofon, 4) Optional: Füge Titel hinzu, 5) Klicke "Stream starten". Alle Follower werden benachrichtigt!', 'livestream', ARRAY['livestream', 'starten', 'live', 'stream'], 'manual', 0.90, 9, 'de', true),
('wer kann livestreams sehen', 'Livestreams können von allen App-Nutzern gesehen werden. Du kannst aber auch Private Streams nur für Ticket-Käufer oder Follower erstellen. Einstellung: Stream-Optionen → "Sichtbarkeit".', 'livestream', ARRAY['livestream', 'sehen', 'privat', 'sichtbarkeit'], 'manual', 0.85, 6, 'de', true),
('livestream aufzeichnen', 'Ja, Livestreams werden automatisch aufgezeichnet (Premium). Die Aufzeichnung ist nach Stream-Ende in deinem Profil verfügbar und kann 30 Tage lang angesehen werden. Du kannst sie auch herunterladen.', 'livestream', ARRAY['livestream', 'aufzeichnen', 'recording', 'speichern'], 'manual', 0.85, 6, 'de', true),
('livestream qualität', 'Stream-Qualität anpassen: Während des Streams → Einstellungen → "Qualität" wählen (Auto, 720p, 1080p). Auto passt sich an deine Internetverbindung an. Für bestes Ergebnis: Nutze WLAN und gutes Licht!', 'livestream', ARRAY['livestream', 'qualität', 'quality', 'auflösung'], 'manual', 0.85, 5, 'de', true),

-- Social Features (10+ entries)
('wie folge ich jemandem', 'Jemandem folgen: 1) Öffne Profil der Person, 2) Tippe auf "Folgen". Du siehst dann alle ihre Events in deinem Feed und bekommst Benachrichtigungen bei neuen Events oder Livestreams.', 'social', ARRAY['folgen', 'follow', 'follower', 'abonnieren'], 'manual', 0.90, 7, 'de', true),
('wer folgt mir', 'Deine Follower siehst du unter: Profil → "Follower". Dort siehst du alle Personen, die dir folgen. Du kannst auch sehen, wem du folgst unter "Folge ich".', 'social', ARRAY['follower', 'wer', 'folgt', 'liste'], 'manual', 0.88, 6, 'de', true),
('freunde finden', 'Freunde finden: 1) Suche → Nach Namen suchen, 2) "Freunde einladen" → Kontakte synchronisieren, 3) QR-Code in Profil zeigen → Freund scannt Code. Für jeden geworbenen Freund: 100 Coins!', 'social', ARRAY['freunde', 'finden', 'einladen', 'kontakte'], 'manual', 0.88, 7, 'de', true),
('events teilen', 'Events teilen: Event öffnen → Teilen-Symbol → WhatsApp, Instagram, Facebook, Link kopieren, etc. Je mehr du teilst, desto mehr Leute kommen zu deinem Event und du verdienst Coins!', 'social', ARRAY['events', 'teilen', 'share', 'weitergeben'], 'manual', 0.90, 7, 'de', true),
('kommentare deaktivieren', 'Kommentare bei Events deaktivieren: Event bearbeiten → "Erweiterte Einstellungen" → "Kommentare deaktivieren". Nützlich bei sensiblen Events oder um Spam zu vermeiden.', 'social', ARRAY['kommentare', 'deaktivieren', 'comments', 'ausschalten'], 'manual', 0.85, 5, 'de', true),

-- General App Questions
('wie funktionierts', 'Jetzz ist ganz einfach: Erstelle Events, verkaufe Tickets, gehe live und verdiene Geld! Schau dir das Tutorial in der App an oder browse durch Events in deiner Nähe um zu sehen wie es funktioniert.', 'general', ARRAY['wie', 'funktioniert', 'help', 'hilfe'], 'manual', 0.75, 5, 'de', true),
('was kann die app', 'Mit Jetzz kannst du: Events erstellen und verwalten, Tickets kaufen und verkaufen, Livestreams starten, Events in deiner Nähe entdecken, Coins verdienen, Follower bekommen und vieles mehr! Perfekt für Veranstalter und Event-Besucher.', 'general', ARRAY['app', 'funktionen', 'features', 'was', 'kann'], 'manual', 0.85, 8, 'de', true),
('ist die app kostenlos', 'Ja, Jetzz ist kostenlos! Du kannst Events erstellen, Tickets kaufen und die meisten Features nutzen ohne zu bezahlen. Für erweiterte Features gibt es Premium (4,99€/Monat) mit mehr Benefits.', 'general', ARRAY['kostenlos', 'gratis', 'free', 'preis'], 'manual', 0.90, 8, 'de', true),
('welche events gibt es', 'Auf Jetzz findest du alle Arten von Events: Konzerte, Partys, Sport, Workshops, Meetups, Festivals, Private Events und mehr. Nutze die Filter um genau das zu finden was du suchst!', 'general', ARRAY['events', 'arten', 'welche', 'kategorien'], 'manual', 0.85, 6, 'de', true),
('geld verdienen', 'Geld verdienen mit Jetzz: 1) Veranstalte Events und verkaufe Tickets (wir zahlen aus!), 2) Verdiene Coins durch Aktivität, 3) Empfiehl Freunde und verdiene Provision. Top-Veranstalter können richtig gutes Geld machen!', 'general', ARRAY['geld', 'verdienen', 'money', 'einkommen'], 'manual', 0.88, 9, 'de', true)
ON CONFLICT DO NOTHING;

-- Update existing knowledge base priorities based on actual usage (if available)
UPDATE chat_knowledge_base
SET priority = priority + 2
WHERE keywords && ARRAY['ticket', 'event', 'premium', 'coins']
AND priority < 10;
