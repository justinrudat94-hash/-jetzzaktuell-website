# Custom Domain Setup für app.jetzzapp.com

## Problem
Die URL `app.jetzzapp.com` gibt 404-Fehler zurück, weil die Custom Domain noch nicht richtig konfiguriert ist.

## Lösung: Schritt für Schritt

### Schritt 1: Custom Domain in Vercel hinzufügen

1. Gehe zu: https://vercel.com/justin-rudats-projects/web
2. Klicke auf "Settings" (oben rechts)
3. Klicke auf "Domains" in der Sidebar
4. Klicke auf "Add Domain"
5. Gib ein: `app.jetzzapp.com`
6. Klicke auf "Add"

### Schritt 2: DNS-Einträge konfigurieren

Vercel wird dir DNS-Einträge anzeigen, die du setzen musst. Du hast zwei Optionen:

**Option A: CNAME (empfohlen)**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

**Option B: A-Record**
```
Type: A
Name: app
Value: 76.76.21.21
```

### Schritt 3: DNS-Einträge beim Domain-Provider setzen

1. Gehe zu deinem Domain-Provider (wo du jetzzapp.com gekauft hast)
2. Öffne die DNS-Verwaltung
3. Füge die DNS-Einträge hinzu, die Vercel dir anzeigt
4. Speichern

### Schritt 4: Warten auf DNS-Propagierung

- DNS-Änderungen können 5-30 Minuten dauern
- Manchmal bis zu 24 Stunden (selten)
- Du kannst den Status in Vercel unter "Domains" sehen

### Schritt 5: SSL-Zertifikat automatisch erstellen

Vercel erstellt automatisch ein SSL-Zertifikat, sobald die DNS-Einträge funktionieren.

## Überprüfung

Nach der DNS-Propagierung sollte Folgendes funktionieren:

1. `https://app.jetzzapp.com` → Zeigt die Jetzz Website
2. `https://app.jetzzapp.com/ticket/[token]` → Zeigt die Ticket-Seite

## Alternative: Temporäre Lösung

Wenn du die Domain noch nicht konfigurieren kannst, verwende die Vercel-URL:

1. Finde deine aktuelle Vercel-URL (z.B. `web-xxx.vercel.app`)
2. Setze in Supabase: `EXPO_PUBLIC_APP_URL=https://deine-vercel-url.vercel.app`
3. Die Ticket-Links werden dann funktionieren (aber mit der Vercel-URL statt Custom Domain)

## Aktueller Status

✅ Supabase Secret gesetzt: `EXPO_PUBLIC_APP_URL=https://app.jetzzapp.com`
❌ Custom Domain nicht konfiguriert
❌ DNS-Einträge fehlen oder noch nicht propagiert

## Nächste Schritte

1. Füge `app.jetzzapp.com` in Vercel hinzu
2. Setze die DNS-Einträge
3. Warte auf DNS-Propagierung
4. Teste die Ticket-URL
