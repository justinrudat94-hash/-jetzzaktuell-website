# Domain Setup: jetzzapp.com mit Vercel

## Schritt 1: Domain in Vercel hinzufügen

1. Gehe zu Vercel Dashboard → Dein Projekt "web"
2. Settings → Domains
3. Klicke auf "Add Domain"
4. Gib ein: **jetzzapp.com**
5. Klicke auf "Add"

## Schritt 2: DNS Records in IONOS setzen

Vercel wird dir DNS Records anzeigen. Du musst diese in IONOS einrichten:

### Für die Hauptdomain (jetzzapp.com):

Gehe zu IONOS → Domains & SSL → jetzzapp.com → DNS

**Option A: A Record (empfohlen)**
```
Type: A
Name: @ (oder leer lassen)
Value: 76.76.21.21
```

**Option B: CNAME Record**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

### Für www Subdomain (www.jetzzapp.com):

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## Schritt 3: SSL-Zertifikat

Vercel generiert automatisch ein SSL-Zertifikat von Let's Encrypt.
Das kann 10-60 Minuten dauern.

## Schritt 4: Environment Variables aktualisieren

### In Vercel:
Vercel → Settings → Environment Variables

Ändere oder füge hinzu:
```
NEXT_PUBLIC_APP_URL=https://jetzzapp.com
```

### In Supabase:
Supabase Dashboard → Project Settings → Edge Functions → Secrets

Setze oder aktualisiere:
```
EXPO_PUBLIC_APP_URL=https://jetzzapp.com
```

**WICHTIG:** Keine `/web` oder andere Pfade hinzufügen!

## Schritt 5: URLs in Ticket-Emails aktualisieren

Die Edge Function `send-ticket-email` nutzt automatisch die `EXPO_PUBLIC_APP_URL` Variable.

Nach dem Update werden alle neuen Ticket-Emails Links wie folgt generieren:
```
https://jetzzapp.com/ticket/[access_token]
```

## Schritt 6: Redirect www → non-www (optional)

In Vercel wird automatisch ein Redirect von www.jetzzapp.com → jetzzapp.com eingerichtet.

Falls du es umgekehrt möchtest, kannst du das in Vercel Settings ändern.

## Schritt 7: Testing

1. Warte bis DNS propagiert ist (10 Minuten - 24 Stunden)
2. Checke https://jetzzapp.com - sollte die Landing Page zeigen
3. Erstelle ein Test-Ticket in der App
4. Prüfe die Email - sollte den neuen Link enthalten
5. Teste den Link im Browser

## DNS Propagation prüfen

Online Tools:
- https://www.whatsmydns.net/
- https://dnschecker.org/

Gib `jetzzapp.com` ein und prüfe ob die Vercel IP überall angezeigt wird.

## Troubleshooting

### "Domain not found"
- DNS Records noch nicht propagiert → Warten (bis zu 24h)
- Falsche DNS Records in IONOS → Nochmal prüfen

### SSL-Fehler
- Vercel generiert SSL automatisch → Warten (10-60 Min)
- Bei Problemen: Vercel Support kontaktieren

### Email-Links funktionieren nicht
- `EXPO_PUBLIC_APP_URL` in Supabase nicht gesetzt
- Edge Function muss neu deployed werden

### Landing Page zeigt sich, aber Tickets nicht
- Next.js Build prüfen
- Vercel Deployment Logs checken

## Kosten

- IONOS Domain: ~15€/Jahr (bereits bezahlt)
- Vercel Hosting: Kostenlos (Hobby Plan)
- SSL-Zertifikat: Kostenlos (Let's Encrypt)

---

**Geschätzte Setup-Zeit:** 30 Minuten + DNS Propagation
**Status:** Bereit für Setup
