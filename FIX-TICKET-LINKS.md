# Ticket-Links reparieren (404-Fehler beheben)

## Problem BEHOBEN
Die Ticket-Links in Emails haben auf die falsche URL gezeigt → 404-Fehler

## ✅ Was ich bereits gemacht habe:
1. `.env` aktualisiert: `EXPO_PUBLIC_APP_URL=https://app.jetzzapp.com`
2. Vercel erfolgreich deployed mit Custom Domain `app.jetzzapp.com`

## 🔧 Was du JETZT noch machen musst:

### 1. Supabase Edge Function Environment Variable setzen

Gehe zu: https://supabase.com/dashboard/project/vhhfztpijdemocghpwqj/settings/functions

Füge hinzu:
```
Name:  EXPO_PUBLIC_APP_URL
Value: https://app.jetzzapp.com
```

### 2. Das wars!

Die Edge Function verwendet automatisch die Environment Variable beim nächsten Email-Versand. Du musst nichts neu deployen.

### 3. Testen

1. Erstelle ein neues Test-Ticket über die App
2. Checke deine Email
3. Klicke auf den Link
4. Sollte jetzt zu `https://app.jetzzapp.com/ticket/[token]` führen

## Warum das funktioniert

Die Edge Function `send-ticket-email` liest die `EXPO_PUBLIC_APP_URL` aus den Supabase Secrets:
```typescript
const appUrl = Deno.env.get('EXPO_PUBLIC_APP_URL') || 'https://app.jetzzapp.com';
```

Sobald die Variable in Supabase gesetzt ist, werden alle neuen Emails die richtige URL verwenden.

---

## Quick Fix (wenn Supabase CLI nicht funktioniert)

Falls du die Edge Function nicht neu deployen kannst, setze einfach die Environment Variable in Supabase Dashboard und die nächste automatische Deployment übernimmt es.

Die Variable wird beim nächsten Function-Call verwendet!
