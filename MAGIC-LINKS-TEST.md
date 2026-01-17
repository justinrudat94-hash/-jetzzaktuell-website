# Magic Links Test-Anleitung

## Voraussetzungen

Bevor du die Magic Links testen kannst, stelle sicher, dass:

1. ✅ Die Website deployed ist auf `app.jetzzapp.com`
2. ✅ Die Supabase Environment Variable `EXPO_PUBLIC_APP_URL` gesetzt ist
3. ✅ Die Edge Function `send-ticket-email` deployed ist
4. ✅ Der Resend API Key konfiguriert ist

## Test-Szenario 1: Ticket erstellen und Magic Link erhalten

### Schritt 1: Ticket in der Mobile App erstellen

1. Öffne die Mobile App
2. Gehe zu **Profil → Support**
3. Klicke auf **"Neues Ticket erstellen"**
4. Fülle das Formular aus:
   - **Betreff:** "Test Magic Link"
   - **Kategorie:** "Technisches Problem"
   - **Beschreibung:** "Ich teste die Magic Link Funktionalität"
5. Klicke auf **"Ticket erstellen"**

### Schritt 2: E-Mail öffnen

1. Öffne dein E-Mail-Postfach
2. Suche nach der E-Mail mit dem Betreff: `[Ticket #XXXXXXXX] Test Magic Link`
3. Die E-Mail sollte folgenden Inhalt haben:
   - Hallo [Dein Username]!
   - Danke für deine Anfrage! Wir haben dein Support-Ticket erhalten...
   - **Button:** "Ticket öffnen und antworten"

### Schritt 3: Magic Link öffnen

1. Klicke auf den Button **"Ticket öffnen und antworten"**
2. Du wirst zur Website weitergeleitet: `https://app.jetzzapp.com/ticket/[access_token]`
3. Die Ticket-Seite sollte angezeigt werden

### Erwartetes Ergebnis

- ✅ E-Mail wird innerhalb von 1-2 Minuten empfangen
- ✅ Magic Link funktioniert und führt zur Website
- ✅ Ticket-Details werden korrekt angezeigt
- ✅ Ticket-ID, Betreff, Kategorie, Status sind sichtbar
- ✅ Deine ursprüngliche Nachricht ist sichtbar

## Test-Szenario 2: Nachricht über Magic Link senden

### Schritt 1: Nachricht schreiben

1. Scrolle zur Nachrichtenzeile am unteren Bildschirmrand
2. Gebe eine Test-Nachricht ein: "Das ist eine Test-Nachricht"
3. Klicke auf **"Senden"**

### Schritt 2: Nachricht überprüfen

1. Die Nachricht sollte sofort erscheinen
2. Die Nachricht sollte als "Du" markiert sein
3. Die Nachricht sollte in einem hellblauen Bubble angezeigt werden

### Erwartetes Ergebnis

- ✅ Nachricht wird sofort gesendet
- ✅ Nachricht erscheint im Chat-Verlauf
- ✅ Kein Fehler tritt auf

## Test-Szenario 3: Admin-Antwort erhalten

### Schritt 1: Admin-Antwort erstellen (Admin-Panel)

1. Öffne die Mobile App als Admin
2. Gehe zu **Admin → Support**
3. Finde das Test-Ticket
4. Klicke auf **"Antworten"**
5. Schreibe eine Antwort: "Hallo, danke für deine Anfrage!"
6. Sende die Antwort

### Schritt 2: E-Mail öffnen

1. Öffne dein E-Mail-Postfach
2. Suche nach der E-Mail mit dem Betreff: `Re: [Ticket #XXXXXXXX] Test Magic Link`
3. Die E-Mail sollte die Admin-Antwort enthalten

### Schritt 3: Magic Link öffnen

1. Klicke auf den Button **"Antworten"**
2. Du wirst zur Website weitergeleitet
3. Die Admin-Antwort sollte sichtbar sein

### Erwartetes Ergebnis

- ✅ E-Mail wird empfangen
- ✅ Admin-Antwort wird korrekt angezeigt
- ✅ Admin-Antwort ist in einem dunkelblauen Bubble mit weißem Text

## Test-Szenario 4: Real-time Updates

### Schritt 1: Zwei Browser-Tabs öffnen

1. Öffne den Magic Link in zwei verschiedenen Browser-Tabs
2. Beide Tabs sollten die gleiche Ticket-Seite anzeigen

### Schritt 2: Nachricht in Tab 1 senden

1. Gehe zu Tab 1
2. Schreibe eine Nachricht: "Real-time Test"
3. Sende die Nachricht

### Schritt 3: Nachricht in Tab 2 überprüfen

1. Gehe zu Tab 2
2. Die Nachricht sollte automatisch erscheinen (ohne Refresh)

### Erwartetes Ergebnis

- ✅ Nachricht erscheint automatisch in beiden Tabs
- ✅ Kein manueller Refresh erforderlich

## Test-Szenario 5: Ticket schließen

### Schritt 1: Ticket schließen (Admin-Panel)

1. Öffne die Mobile App als Admin
2. Gehe zu **Admin → Support**
3. Finde das Test-Ticket
4. Klicke auf **"Ticket schließen"**
5. Schreibe eine Abschlussnachricht: "Dein Problem wurde gelöst!"
6. Schließe das Ticket

### Schritt 2: E-Mail öffnen

1. Öffne dein E-Mail-Postfach
2. Suche nach der E-Mail mit dem Betreff: `[Ticket #XXXXXXXX] Ticket wurde geschlossen`
3. Die E-Mail sollte die Abschlussnachricht enthalten

### Schritt 3: Magic Link öffnen

1. Klicke auf den Button **"Ticket wieder öffnen"**
2. Du wirst zur Website weitergeleitet
3. Es sollte ein grünes Banner mit "Ticket geschlossen" angezeigt werden
4. Die Nachrichtenzeile sollte deaktiviert sein
5. Ein gelber Footer sollte angezeigt werden: "Dieses Ticket wurde geschlossen..."

### Erwartetes Ergebnis

- ✅ E-Mail wird empfangen
- ✅ Geschlossenes Ticket wird korrekt angezeigt
- ✅ Nachrichtenzeile ist deaktiviert
- ✅ Gelber Footer ist sichtbar

## Troubleshooting

### Problem: E-Mail wird nicht empfangen

**Mögliche Ursachen:**
1. Resend API Key ist nicht konfiguriert
2. E-Mail-Adresse ist ungültig
3. E-Mail landet im Spam-Ordner

**Lösung:**
1. Prüfe Supabase Edge Function Logs
2. Prüfe `api_keys` Tabelle für Resend Key
3. Prüfe Spam-Ordner
4. Teste mit einer anderen E-Mail-Adresse

### Problem: Magic Link führt zu 404

**Mögliche Ursachen:**
1. Website ist nicht deployed
2. Route `/ticket/[token]` existiert nicht
3. Vercel Deployment fehlgeschlagen

**Lösung:**
1. Prüfe Vercel Deployment Status
2. Prüfe ob `web/app/ticket/[token]/page.tsx` existiert
3. Prüfe Vercel Logs für Fehler
4. Deploye die Website neu

### Problem: Magic Link zeigt "Ticket nicht gefunden"

**Mögliche Ursachen:**
1. `access_token` stimmt nicht überein
2. Ticket existiert nicht in der Datenbank
3. RLS-Policy blockiert Zugriff

**Lösung:**
1. Prüfe Supabase Datenbank: `SELECT * FROM support_tickets WHERE access_token = '[token]'`
2. Prüfe Browser Console für Fehler
3. Prüfe Supabase Logs
4. Prüfe RLS-Policies für `support_tickets`

### Problem: Nachrichten können nicht gesendet werden

**Mögliche Ursachen:**
1. RLS-Policy blockiert INSERT
2. Ticket ist geschlossen
3. Netzwerkfehler

**Lösung:**
1. Prüfe Browser Console für Fehler
2. Prüfe Ticket-Status
3. Prüfe RLS-Policies für `ticket_responses`
4. Prüfe Supabase Logs

### Problem: Real-time Updates funktionieren nicht

**Mögliche Ursachen:**
1. Supabase Real-time ist nicht aktiviert
2. Channel-Subscription fehlgeschlagen
3. Firewall blockiert WebSocket-Verbindung

**Lösung:**
1. Prüfe Supabase Dashboard → Database → Replication
2. Aktiviere Real-time für `ticket_responses` Tabelle
3. Prüfe Browser Console für WebSocket-Fehler
4. Teste mit anderem Netzwerk

## Erweiterte Tests

### Test 1: Mehrere Tickets gleichzeitig

1. Erstelle 3 verschiedene Tickets
2. Öffne alle 3 Magic Links in verschiedenen Tabs
3. Sende Nachrichten in allen 3 Tickets
4. Prüfe ob die Nachrichten nur im richtigen Ticket erscheinen

### Test 2: Ungültiger Access Token

1. Öffne die URL: `https://app.jetzzapp.com/ticket/invalid-token-123`
2. Es sollte "Ticket nicht gefunden" angezeigt werden

### Test 3: Sehr lange Nachrichten

1. Öffne einen Magic Link
2. Schreibe eine sehr lange Nachricht (>500 Zeichen)
3. Sende die Nachricht
4. Prüfe ob die Nachricht korrekt angezeigt wird

### Test 4: Sonderzeichen in Nachrichten

1. Öffne einen Magic Link
2. Schreibe eine Nachricht mit Sonderzeichen: "Äöü ß € @ # $ % & *"
3. Sende die Nachricht
4. Prüfe ob die Sonderzeichen korrekt angezeigt werden

### Test 5: Mobile vs. Desktop

1. Öffne den Magic Link auf einem Smartphone
2. Öffne den gleichen Magic Link auf einem Desktop
3. Sende Nachrichten von beiden Geräten
4. Prüfe ob die Darstellung auf beiden Geräten korrekt ist

## Performance-Tests

### Test 1: Viele Nachrichten

1. Sende 50+ Nachrichten in einem Ticket
2. Öffne den Magic Link
3. Prüfe ob die Seite schnell lädt
4. Prüfe ob Scrolling flüssig ist

### Test 2: Gleichzeitige Benutzer

1. Öffne den Magic Link in 5 verschiedenen Browsern
2. Sende Nachrichten von allen Browsern gleichzeitig
3. Prüfe ob alle Updates korrekt synchronisiert werden

### Test 3: Lange Inaktivität

1. Öffne einen Magic Link
2. Lasse den Tab 30 Minuten offen (ohne Aktivität)
3. Sende eine Nachricht
4. Prüfe ob die Nachricht erfolgreich gesendet wird

## Sicherheits-Tests

### Test 1: Access Token in URL ändern

1. Öffne einen Magic Link
2. Ändere den `access_token` in der URL manuell
3. Du solltest "Ticket nicht gefunden" sehen

### Test 2: Fremdes Ticket öffnen

1. Erstelle ein Ticket mit Benutzer A
2. Kopiere den Magic Link
3. Öffne den Link als Benutzer B (ohne eingeloggt zu sein)
4. Du solltest das Ticket sehen können (da Magic Links öffentlich sind)

### Test 3: SQL Injection

1. Versuche SQL Injection in der Nachricht: `'; DROP TABLE support_tickets; --`
2. Die Nachricht sollte sicher gespeichert werden
3. Keine Datenbankänderung sollte stattfinden

## Checkliste für Produktions-Release

Bevor du Magic Links in Produktion verwendest, stelle sicher:

- [ ] `EXPO_PUBLIC_APP_URL` ist auf die richtige Domain gesetzt
- [ ] Website ist auf `app.jetzzapp.com` deployed
- [ ] SSL-Zertifikat ist konfiguriert (HTTPS)
- [ ] Resend API Key ist konfiguriert
- [ ] E-Mail-Templates sind getestet
- [ ] RLS-Policies sind korrekt konfiguriert
- [ ] Real-time ist für `ticket_responses` aktiviert
- [ ] Alle Test-Szenarien sind erfolgreich
- [ ] Performance ist akzeptabel (< 2s Ladezeit)
- [ ] Mobile Ansicht ist responsive
- [ ] Desktop Ansicht ist responsive
- [ ] Error Handling funktioniert korrekt
- [ ] Logs werden korrekt geschrieben
- [ ] Monitoring ist eingerichtet

## Monitoring

Nach dem Release solltest du überwachen:

1. **E-Mail-Versand-Rate**
   - Wie viele E-Mails werden erfolgreich versendet?
   - Query: `SELECT COUNT(*) FROM support_tickets WHERE created_at > NOW() - INTERVAL '1 day'`

2. **Magic Link Öffnungsrate**
   - Wie viele Benutzer öffnen den Magic Link?
   - Implementiere Analytics auf der Ticket-Seite

3. **Antwortrate**
   - Wie viele Benutzer antworten über den Magic Link?
   - Query: `SELECT COUNT(*) FROM ticket_responses WHERE is_admin_response = false`

4. **Fehlerrate**
   - Wie viele Magic Links führen zu Fehlern?
   - Prüfe Supabase und Vercel Logs

5. **Response Time**
   - Wie lange dauert es, bis die Ticket-Seite lädt?
   - Verwende Browser DevTools oder externe Monitoring-Tools

## Zusammenfassung

Magic Links bieten eine benutzerfreundliche Möglichkeit, Support-Tickets zu verwalten, ohne dass Benutzer sich einloggen müssen. Mit den oben beschriebenen Tests kannst du sicherstellen, dass die Funktionalität korrekt implementiert ist und in allen Szenarien funktioniert.

**Wichtigste Punkte:**
- ✅ Magic Links führen zur Website, nicht zur Mobile App
- ✅ `EXPO_PUBLIC_APP_URL` muss in Supabase gesetzt sein
- ✅ Real-time Updates funktionieren automatisch
- ✅ RLS-Policies müssen korrekt konfiguriert sein
- ✅ E-Mail-Templates müssen getestet werden
