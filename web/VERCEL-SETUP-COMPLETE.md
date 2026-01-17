# Vercel Deployment Setup - Komplette Anleitung

## Problem gelöst: Build funktioniert lokal, aber nicht auf Vercel

Der Build läuft lokal ohne Fehler. Das Problem liegt in der Vercel-Konfiguration.

---

## 1. Vercel Projekt-Einstellungen

### Root Directory festlegen

**WICHTIG:** Dein Projekt hat zwei Teile:
- `/` - Expo/React Native App
- `/web` - Next.js Website

Vercel muss wissen, dass es nur das `/web`-Verzeichnis bauen soll!

1. Gehe zu [Vercel Dashboard](https://vercel.com/dashboard)
2. Wähle dein Projekt
3. Gehe zu **Settings** → **General**
4. Finde **Root Directory**
5. Setze: `web`
6. **Save**

---

## 2. Umgebungsvariablen setzen

Gehe zu **Settings** → **Environment Variables**

Füge diese beiden Variablen hinzu:

### Variable 1: NEXT_PUBLIC_SUPABASE_URL
```
https://vhhfztpijdemocghpwqj.supabase.co
```
- **Environments**: Production, Preview, Development (alle auswählen)

### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaGZ6dHBpamRlbW9jZ2hwd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTg1MzUsImV4cCI6MjA3NTQ5NDUzNX0.BxIBpS3rXM0qrfpcJQzXSdJ4zxHQOAnbC46p15PcIBM
```
- **Environments**: Production, Preview, Development (alle auswählen)

---

## 3. Build & Development Settings

Gehe zu **Settings** → **General** → **Build & Development Settings**

Stelle sicher, dass folgendes eingestellt ist:

- **Framework Preset**: `Next.js`
- **Build Command**: `next build` (oder leer lassen für Auto-Detect)
- **Output Directory**: `.next` (oder leer lassen für Auto-Detect)
- **Install Command**: `npm install` (oder leer lassen für Auto-Detect)

---

## 4. Redeploy

Nach den Änderungen:

1. Gehe zu **Deployments**
2. Klicke auf die drei Punkte (`...`) beim letzten Deployment
3. Klicke **Redeploy**
4. Warte auf den Build

---

## 5. Wenn der Build immer noch fehlschlägt

### Vercel Build Log prüfen

1. Gehe zu **Deployments** → Klicke auf das fehlgeschlagene Deployment
2. Scrolle zu **Build Logs**
3. Suche nach der genauen Fehlermeldung

### Häufige Fehler

#### Fehler: "Cannot find module 'next'"
**Lösung:** Root Directory auf `web` setzen (siehe Schritt 1)

#### Fehler: "NEXT_PUBLIC_SUPABASE_URL is not defined"
**Lösung:** Umgebungsvariablen setzen (siehe Schritt 2)

#### Fehler: "Build command failed"
**Lösung:**
1. Prüfe ob alle Dependencies in `web/package.json` vorhanden sind
2. Lösche auf Vercel unter Settings → General → Clear Build Cache
3. Redeploy

---

## 6. Manuelle Vercel CLI Deployment (Alternative)

Falls das Dashboard-Deployment nicht funktioniert, kannst du auch die Vercel CLI nutzen:

```bash
# Vercel CLI installieren (falls noch nicht installiert)
npm install -g vercel

# In das web-Verzeichnis wechseln
cd web

# Deployment starten
vercel --prod

# Folge den Anweisungen
# - Wähle dein Team/Account
# - Bestätige das Projekt
# - Warte auf Deployment
```

---

## 7. Custom Domain einrichten (Optional)

Nach erfolgreichem Deployment:

1. Gehe zu **Settings** → **Domains**
2. Klicke **Add Domain**
3. Gib deine Domain ein (z.B. `jetzzapp.com`)
4. Folge den DNS-Anweisungen
5. Vercel richtet automatisch SSL ein

---

## 8. Ticket-System testen

Nach dem Deployment kannst du das Ticket-System testen:

1. Gehe zu deiner Vercel-URL + `/ticket/[token]`
2. Ersetze `[token]` mit einem echten Support-Ticket-Token
3. Die Seite sollte das Ticket anzeigen

Beispiel: `https://deine-url.vercel.app/ticket/abc123token`

---

## 9. GitHub Integration (Automatisches Deployment)

Vercel kann automatisch deployen bei jedem Git Push:

1. **Settings** → **Git**
2. Stelle sicher, dass **Production Branch** auf `main` gesetzt ist
3. Bei jedem Push zu `main` wird automatisch deployed
4. Preview-Deployments für jeden Pull Request

---

## Status Check

✅ Lokaler Build funktioniert
✅ Dependencies installiert
✅ Environment Variables konfiguriert
⚠️ Vercel Root Directory muss auf `web` gesetzt werden
⚠️ Vercel Environment Variables müssen gesetzt werden

---

## Support

Falls du immer noch Probleme hast, schicke mir:
1. Den vollständigen Build Log von Vercel
2. Screenshot der Settings → General Seite
3. Screenshot der Environment Variables Seite
