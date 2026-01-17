# Vercel Environment Variables einrichten

## Problem
Die Website ist deployed, aber zeigt nur "Ticket" und den Token - die Chat-UI lädt nicht!

## Ursache
Die Supabase Environment Variables fehlen in Vercel!

## Lösung (3 Minuten)

1. **Gehe zu Vercel**: https://vercel.com/justin-rudats-projects/web
2. Klicke auf **Settings** (oben im Menü)
3. Klicke links auf **Environment Variables**
4. Füge folgende Variables hinzu:

### Variable 1: NEXT_PUBLIC_SUPABASE_URL
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://vhhfztpijdemocghpwqj.supabase.co`
- **Environments**: Production, Preview, Development (alle 3 auswählen!)

### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaGZ6dHBpamRlbW9jZ2hwd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTg1MzUsImV4cCI6MjA3NTQ5NDUzNX0.BxIBpS3rXM0qrfpcJQzXSdJ4zxHQOAnbC46p15PcIBM`
- **Environments**: Production, Preview, Development (alle 3 auswählen!)

5. Klicke auf **Save** bei beiden
6. **Redeploy ausführen**:
   - Gehe zurück zu **Deployments**
   - Klicke bei der letzten Deployment auf die 3 Punkte (...)
   - Wähle **Redeploy**
   - Klicke **Redeploy** bestätigen

## Nach dem Redeploy (ca. 30 Sekunden)
Die Ticket-Seite wird funktionieren:
- Echtzeit-Chat wird geladen
- Nachrichten werden angezeigt
- User kann antworten

## Warum ist das nötig?
Vercel baut die Website in der Cloud und kennt die lokale `.env` Datei nicht.
Du musst die Environment Variables direkt in Vercel eingeben.
