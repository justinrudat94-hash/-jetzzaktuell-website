# Ticket System Web Deployment Guide

## Übersicht

Die Support-Ticket Magic Links funktionieren jetzt sowohl im Browser als auch in der Mobile App!

## Was wurde implementiert?

### 1. Web-Version der Ticket-Ansicht
- **Route**: `/ticket/[token]`
- **Features**:
  - Ticket-Details anzeigen (Subject, Status, Kategorie)
  - Vollständiger Nachrichtenverlauf
  - Neue Nachrichten senden
  - Realtime-Updates via Supabase
  - Responsive Design mit Tailwind CSS
  - Status-Badges und Zeitstempel

### 2. Build-Konfiguration
- Next.js Config auf SSR umgestellt (von static export)
- Ticket-Routes sind dynamisch, Landing Page ist statisch
- `.gitignore` erweitert um `web/.next/` und `web/out/`

### 3. Vercel Deployment
- `vercel.json` aktualisiert mit korrekten Build Commands
- Framework auf "nextjs" gesetzt

## Vercel Deployment Schritte

### 1. Vercel Dashboard Einstellungen

Gehe zu deinem Vercel Projekt und setze folgende Einstellungen:

**Build & Development Settings:**
- Framework Preset: `Next.js`
- Root Directory: `.` (leer lassen oder Root)
- Build Command: `cd web && npm install && npm run build`
- Output Directory: `web/.next`
- Install Command: `npm install --prefix web`

### 2. Environment Variables in Vercel setzen

Füge folgende Environment Variables hinzu:

```
NEXT_PUBLIC_SUPABASE_URL=https://vhhfztpijdemocghpwqj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Diese sind bereits in `web/.env` vorhanden und werden automatisch geladen, aber für Production solltest du sie in Vercel setzen.

### 3. Custom Domain (Optional)

Falls du eine Custom Domain nutzt:
1. Füge sie in Vercel hinzu (z.B. `jetzz-website.vercel.app` oder `jetzz.app`)
2. Aktualisiere die Environment Variable in Supabase:
   - Gehe zu Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - Setze `EXPO_PUBLIC_APP_URL` auf deine Domain (z.B. `https://jetzz.app`)

**WICHTIG**: Die URL sollte **KEINE** `/web` oder andere Pfade enthalten!

### 4. Deploy

```bash
# Option 1: Automatic Deployment via Git
git add .
git commit -m "Add web ticket system"
git push

# Option 2: Manual Deployment
cd web
vercel --prod
```

## Testing

### 1. Ticket in der App erstellen
1. Öffne die Mobile App
2. Gehe zu Profil → Support → Ticket erstellen
3. Erstelle ein Test-Ticket

### 2. Email-Link testen
1. Du erhältst eine Email mit dem Ticket-Link
2. Klicke auf den Link im Browser
3. Die Ticket-Seite sollte laden mit allen Nachrichten
4. Sende eine Test-Nachricht
5. Prüfe ob die Nachricht erscheint

### 3. Realtime testen
1. Öffne das Ticket im Browser
2. Öffne das gleiche Ticket in der App (oder in einem zweiten Browser-Tab)
3. Sende eine Nachricht in einem der beiden
4. Die Nachricht sollte in beiden automatisch erscheinen

### 4. Mobile Deep Link testen
1. Öffne den Email-Link auf einem Smartphone
2. Die App sollte sich automatisch öffnen (Deep Link)
3. Falls die App nicht installiert ist, öffnet sich der Browser

## Wie funktioniert es?

### Magic Links
Die Edge Function `send-ticket-email` generiert Links mit diesem Format:
```
https://jetzz.app/ticket/[access_token]
```

### Routing
- **Browser**: Next.js Server-Side Rendered Route
- **Mobile App**: Deep Link wird von Expo Router abgefangen
- **Nicht installierte App**: Browser öffnet die Web-Version

### Supabase Realtime
Beide Versionen (Web + Mobile) nutzen Supabase Realtime Subscriptions:
```typescript
supabase
  .channel(`ticket_${token}`)
  .on('postgres_changes', {
    event: 'INSERT',
    table: 'ticket_responses'
  })
  .subscribe()
```

## Troubleshooting

### "Ticket nicht gefunden"
- Prüfe ob der `access_token` korrekt ist
- Checke die RLS Policies in Supabase
- Schaue in die Browser Console für Fehler

### Keine Realtime-Updates
- Prüfe ob Supabase Realtime aktiviert ist
- Checke die Supabase Connection im Browser DevTools
- Stelle sicher dass die `ticket_responses` Table Realtime enabled hat

### Email-Links funktionieren nicht
- Prüfe die `EXPO_PUBLIC_APP_URL` in Supabase Edge Functions Secrets
- Stelle sicher dass die URL auf die richtige Domain zeigt
- Teste die URL manuell im Browser

### Build Fehler
- Stelle sicher dass alle Dependencies installiert sind: `cd web && npm install`
- Prüfe ob die Supabase Client Config korrekt ist
- Checke die Next.js Logs in Vercel

## Nächste Schritte (Optional)

### 1. Custom Domain
- Domain kaufen (z.B. `jetzz.app`)
- In Vercel hinzufügen
- DNS Records setzen
- Environment Variable aktualisieren

### 2. Email Template Optimierung
- Logo in Emails einfügen
- Mehr Styling hinzufügen
- Preview-Text optimieren

### 3. Analytics
- Google Analytics hinzufügen
- Ticket-Klicks tracken
- Response-Zeiten messen

### 4. SEO
- Meta Tags für Ticket-Seiten
- OpenGraph Images
- Robots.txt

## Support

Falls Probleme auftreten:
1. Checke die Vercel Deployment Logs
2. Schaue in die Browser Console
3. Prüfe die Supabase Edge Function Logs
4. Teste die API-Calls direkt in Postman

---

**Status**: ✅ Implementiert und bereit für Deployment
**Letzte Aktualisierung**: 2026-01-15
