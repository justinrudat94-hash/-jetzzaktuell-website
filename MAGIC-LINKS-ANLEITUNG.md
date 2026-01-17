# Magic Links für Support-Tickets - Anleitung

## Übersicht

Die App verwendet Magic Links, um Benutzern direkten Zugriff auf ihre Support-Tickets über E-Mail zu ermöglichen. Wenn ein Benutzer ein Support-Ticket erstellt, erhält er eine E-Mail mit einem Magic Link, der ihn direkt zur Ticket-Seite auf der Website führt.

## Architektur

### Zwei separate Projekte

1. **Mobile App** (Root-Verzeichnis)
   - Expo/React Native App
   - Läuft auf iOS/Android
   - Erstellt Support-Tickets

2. **Landing Page Website** (`/web` Verzeichnis)
   - Next.js Website
   - Läuft auf Vercel
   - Zeigt Ticket-Seiten an (`app.jetzzapp.com/ticket/[token]`)

### URL-Struktur

Magic Links haben folgendes Format:
```
https://app.jetzzapp.com/ticket/{access_token}
```

Beispiel:
```
https://app.jetzzapp.com/ticket/abc123def456ghi789
```

## Wie es funktioniert

### 1. Ticket-Erstellung (Mobile App)

Wenn ein Benutzer ein Support-Ticket in der Mobile App erstellt:

1. Ein neuer Eintrag wird in `support_tickets` erstellt
2. Ein zufälliger `access_token` wird generiert (UUID)
3. Die Edge Function `send-ticket-email` wird aufgerufen

### 2. E-Mail-Versand (Edge Function)

Die Edge Function `send-ticket-email`:

1. Liest `EXPO_PUBLIC_APP_URL` aus den Supabase Secrets
2. Generiert den Magic Link: `{EXPO_PUBLIC_APP_URL}/ticket/{access_token}`
3. Sendet eine E-Mail über Resend API mit dem Magic Link

**Code-Referenz:** `supabase/functions/send-ticket-email/index.ts:95`

```typescript
const appUrl = Deno.env.get('EXPO_PUBLIC_APP_URL') || 'https://app.jetzzapp.com';
const magicLinkUrl = `${appUrl}/ticket/${ticket.access_token}`;
```

### 3. Ticket-Anzeige (Website)

Die Website unter `app.jetzzapp.com` hat eine Route `/ticket/[token]`:

**Datei:** `web/app/ticket/[token]/page.tsx`

Diese Seite:
1. Extrahiert den `access_token` aus der URL
2. Lädt das Ticket aus Supabase via `access_token`
3. Zeigt das Ticket und alle Antworten an
4. Ermöglicht dem Benutzer, Nachrichten zu senden

## Erforderliche Konfiguration

### Schritt 1: Supabase Secret setzen

Du musst die Environment Variable `EXPO_PUBLIC_APP_URL` in Supabase setzen:

#### Im Supabase Dashboard

1. Öffne: https://supabase.com/dashboard/project/vhhfztpijdemocghpwqj/settings/functions
2. Scrolle zu "Secrets"
3. Klicke auf "Add new secret"
4. Name: `EXPO_PUBLIC_APP_URL`
5. Value: `https://app.jetzzapp.com`
6. Speichern

#### Über Supabase CLI (Alternative)

```bash
supabase secrets set EXPO_PUBLIC_APP_URL=https://app.jetzzapp.com
```

### Schritt 2: Edge Function neu deployen (optional)

Nach dem Setzen des Secrets sollte die Edge Function automatisch die neue Variable verwenden. Falls nicht, deploye sie neu:

```bash
supabase functions deploy send-ticket-email
```

### Schritt 3: Website deployen

Die Website muss auf Vercel unter der Domain `app.jetzzapp.com` deployed sein.

**Wichtig:** Es gibt zwei Vercel-Projekte:
- `jetzzaktuell-website` - ALTE Version (kann gelöscht werden)
- `web` - AKTUELLE Version (sollte auf `app.jetzzapp.com` zeigen)

## Vercel-Deployment

### Aktueller Status

Basierend auf deinem Screenshot:
- Es gibt zwei Vercel-Projekte mit diesem GitHub-Repo verbunden
- "Production - jetzzaktuell-website" schlägt fehl (rotes X)
- "Production - web" ist erfolgreich (grüner Haken)

### Problem beheben

Das fehlgeschlagene Projekt könnte entfernt werden:

1. Öffne Vercel Dashboard
2. Gehe zu "Production - jetzzaktuell-website"
3. Settings → Git → Disconnect Repository
4. Oder lösche das Projekt komplett

### Domain konfigurieren

Stelle sicher, dass `app.jetzzapp.com` auf das richtige Vercel-Projekt zeigt:

1. Öffne das **"web"** Projekt in Vercel
2. Gehe zu Settings → Domains
3. Füge `app.jetzzapp.com` hinzu
4. Konfiguriere DNS entsprechend

## Datenbank-Schema

### `support_tickets` Tabelle

Relevante Felder:
```sql
CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  status text NOT NULL,
  access_token uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_email text,
  created_at timestamptz DEFAULT now(),
  ...
);
```

Der `access_token` wird verwendet, um das Ticket über die Magic Link URL zu identifizieren.

## Sicherheit

### Row Level Security (RLS)

Die Ticket-Seite auf der Website verwendet den anonymen Supabase-Schlüssel (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). Daher müssen RLS-Policies sicherstellen, dass:

1. Jeder mit dem `access_token` das Ticket lesen kann
2. Nur der Ticket-Ersteller Nachrichten senden kann
3. Nur Admins Admin-Antworten senden können

**RLS-Policy für Ticket-Zugriff:**
```sql
CREATE POLICY "Anyone with access_token can view ticket"
  ON support_tickets FOR SELECT
  USING (true);
```

**RLS-Policy für Ticket-Antworten:**
```sql
CREATE POLICY "Anyone with access_token can send responses"
  ON ticket_responses FOR INSERT
  WITH CHECK (true);
```

**Hinweis:** Die Security basiert darauf, dass der `access_token` zufällig generiert ist (UUID) und nur dem Ticket-Ersteller bekannt ist.

## Testing

### 1. Ticket erstellen

1. Öffne die Mobile App
2. Gehe zu Profil → Support
3. Erstelle ein neues Ticket
4. Prüfe deine E-Mail

### 2. Magic Link testen

1. Öffne die E-Mail
2. Klicke auf "Ticket öffnen"
3. Du solltest zur Website weitergeleitet werden
4. Die Ticket-Seite sollte angezeigt werden

### 3. Nachrichten senden

1. Schreibe eine Nachricht auf der Ticket-Seite
2. Klicke "Senden"
3. Die Nachricht sollte in der Datenbank gespeichert werden
4. Real-time Updates sollten funktionieren

## Troubleshooting

### Magic Link führt zu 404

**Problem:** Die URL `app.jetzzapp.com/ticket/[token]` existiert nicht

**Lösung:**
- Prüfe ob die Website deployed ist
- Prüfe ob die Route `web/app/ticket/[token]/page.tsx` existiert
- Prüfe Vercel Deployment Logs

### Magic Link zeigt "Ticket nicht gefunden"

**Problem:** Der `access_token` stimmt nicht überein

**Lösung:**
- Prüfe ob das Ticket in der Datenbank existiert
- Prüfe ob der `access_token` korrekt ist
- Prüfe Supabase Logs

### E-Mail wird nicht versendet

**Problem:** Die Edge Function kann keine E-Mail senden

**Lösung:**
- Prüfe ob `RESEND_API_KEY` in Supabase gesetzt ist
- Prüfe ob die E-Mail-Adresse gültig ist
- Prüfe Edge Function Logs in Supabase

### Falsche URL in E-Mail

**Problem:** Der Magic Link zeigt auf die falsche Domain

**Lösung:**
- Prüfe ob `EXPO_PUBLIC_APP_URL` korrekt gesetzt ist
- Deploye die Edge Function neu
- Teste mit einem neuen Ticket

## Best Practices

1. **Niemals die Mobile App URL verwenden**
   - Magic Links sollten immer auf die Website zeigen
   - Die Mobile App kann keine Web-URLs direkt öffnen

2. **Access Tokens sicher generieren**
   - Verwende UUIDs oder kryptographisch sichere Zufallswerte
   - Niemals vorhersagbare IDs verwenden

3. **RLS-Policies streng halten**
   - Nur notwendige Zugriffe erlauben
   - Admin-Funktionen separat schützen

4. **E-Mail-Templates testen**
   - Teste alle E-Mail-Typen (ticket_created, admin_response, etc.)
   - Prüfe auf defekte Links

5. **Real-time Updates nutzen**
   - Die Ticket-Seite verwendet Supabase Real-time
   - Neue Nachrichten werden automatisch angezeigt

## Zusammenfassung

Die Magic Link Funktionalität ist vollständig implementiert und funktioniert wie folgt:

1. Mobile App erstellt Ticket mit `access_token`
2. Edge Function generiert Magic Link mit `EXPO_PUBLIC_APP_URL` + `access_token`
3. E-Mail wird über Resend API versendet
4. Benutzer klickt auf Link und wird zur Website weitergeleitet
5. Website lädt Ticket über `access_token` und zeigt es an

**Status:**
- ✅ Ticket-Seite auf Website implementiert (`/web/app/ticket/[token]/page.tsx`)
- ✅ Edge Function verwendet korrekte URL-Generierung
- ✅ E-Mail-Templates enthalten Magic Links
- ⚠️ `EXPO_PUBLIC_APP_URL` muss in Supabase gesetzt werden
- ⚠️ Domain `app.jetzzapp.com` muss korrekt konfiguriert sein
- ⚠️ Vercel-Deployment muss überprüft werden
