# Jetzz Website - Deployment Anleitung

Diese Anleitung beschreibt Schritt für Schritt, wie die Jetzz Marketing-Website auf Vercel deployed wird.

## Status

Die Website ist **vollständig fertig** und deployment-ready:

- ✅ Alle rechtlichen Seiten sind ausgefüllt (Impressum, Datenschutz, AGB, Widerruf)
- ✅ Firmendaten (IMMOPRO LLC) sind eingefügt
- ✅ Environment Variables sind konfiguriert
- ✅ Design und Navigation sind fertig
- ✅ Responsive für alle Geräte

## Voraussetzungen

1. GitHub Account
2. Vercel Account (kostenlos)
3. Das Vercel-Projekt "jetzz-website" existiert bereits

## Option 1: Mit bestehendem Vercel-Projekt (EMPFOHLEN)

Du hast bereits ein Vercel-Projekt "jetzz-website" erstellt. So verbindest du es:

### Schritt 1: GitHub Repository vorbereiten

Du hast 2 Möglichkeiten:

#### A) Neues separates Repository (EMPFOHLEN)

```bash
# 1. Erstelle ein neues Repository auf GitHub: jetzz-website
# 2. Klone das neue Repository lokal
git clone https://github.com/[dein-username]/jetzz-website.git

# 3. Kopiere den Inhalt des /web Ordners in das neue Repository
cp -r /pfad/zum/projekt/web/* /pfad/zum/jetzz-website/

# 4. Commit und Push
cd /pfad/zum/jetzz-website
git add .
git commit -m "Initial commit: Jetzz marketing website"
git push origin main
```

**Vorteile:**
- Saubere Trennung App vs. Website
- Kleineres Repository
- Schnelleres Deployment
- Keine App-Dateien im Website-Code

#### B) Bestehendes Repository nutzen

Falls du das gleiche Repository wie für die App nutzen möchtest:
- Vercel kann direkt auf den `/web` Ordner zugreifen
- Stelle in Vercel "Root Directory" auf `web`

### Schritt 2: Vercel mit GitHub verbinden

1. Gehe zu [Vercel Dashboard](https://vercel.com/dashboard)
2. Öffne dein Projekt "jetzz-website"
3. Gehe zu Settings → Git
4. Klicke auf "Connect Git Repository"
5. Wähle dein GitHub Repository aus
6. Autorisiere Vercel für den Zugriff

### Schritt 3: Projekt-Einstellungen konfigurieren

In Vercel → Settings → General:

- **Framework Preset**: Next.js (wird automatisch erkannt)
- **Root Directory**:
  - Bei separatem Repo: `.` (Standard)
  - Bei main Repo: `web`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Schritt 4: Environment Variables hinzufügen

Gehe zu Settings → Environment Variables und füge hinzu:

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://vhhfztpijdemocghpwqj.supabase.co

Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaGZ6dHBpamRlbW9jZ2hwd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTg1MzUsImV4cCI6MjA3NTQ5NDUzNX0.BxIBpS3rXM0qrfpcJQzXSdJ4zxHQOAnbC46p15PcIBM
```

Wähle bei beiden: **All Environments** (Production, Preview, Development)

### Schritt 5: Deployment starten

1. Gehe zu Deployments
2. Klicke auf "Create Deployment" oder "Redeploy"
3. Warte 2-3 Minuten
4. Deine Website ist live unter: `jetzz-website.vercel.app`

## Option 2: Neues Vercel-Projekt erstellen

Falls du ein komplett neues Vercel-Projekt erstellen möchtest:

### Schritt 1: GitHub Repository vorbereiten (siehe oben)

### Schritt 2: Vercel-Projekt erstellen

1. Gehe zu [Vercel Dashboard](https://vercel.com)
2. Klicke auf "Add New Project"
3. Wähle "Import Git Repository"
4. Suche dein Repository "jetzz-website"
5. Klicke auf "Import"

### Schritt 3: Projekt konfigurieren

Vercel erkennt automatisch Next.js. Konfiguriere:

- **Project Name**: jetzz-website
- **Framework**: Next.js (auto-detected)
- **Root Directory**: `.` oder `web` (je nach Setup)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### Schritt 4: Environment Variables

Klicke auf "Environment Variables" und füge die Supabase-Variablen hinzu (siehe oben).

### Schritt 5: Deploy

1. Klicke auf "Deploy"
2. Warte auf den Build
3. Fertig! Website ist live

## Nach dem Deployment

### Automatische Updates

Ab jetzt wird jeder Push zum GitHub-Repository automatisch deployed:
- Push zu `main` → Production Deployment
- Push zu anderen Branches → Preview Deployment

### Domain verbinden (Optional)

Später kannst du eine eigene Domain verbinden:

1. Gehe zu Settings → Domains
2. Klicke "Add Domain"
3. Gib deine Domain ein: `jetzz.app` oder `www.jetzz.app`
4. Folge den DNS-Anweisungen
5. SSL wird automatisch eingerichtet

### Website-URLs

Nach Deployment:
- **Production**: `https://jetzz-website.vercel.app`
- **Custom Domain**: `https://jetzz.app` (nach Konfiguration)

## Wichtige Hinweise

### Nicht vergessen

1. **.env Datei NICHT in Git committen**
   - Die `.env` ist bereits in `.gitignore`
   - Environment Variables nur in Vercel Dashboard hinterlegen

2. **Bilder ersetzen**
   - Aktuell: Pexels-Platzhalter
   - Später: Eigene App-Screenshots verwenden

3. **Rechtliche Dokumente prüfen**
   - Alle Texte sind ausgefüllt
   - Bei Änderungen in der App: Auch Website aktualisieren

### Troubleshooting

#### Build schlägt fehl

```bash
# Lokaler Test (nur wenn Node.js installiert):
cd web
npm install
npm run build
```

Falls Fehler auftreten:
- Prüfe package.json
- Prüfe next.config.js
- Schaue in Vercel Build Logs

#### Environment Variables funktionieren nicht

- Stelle sicher, dass sie mit `NEXT_PUBLIC_` beginnen
- Überprüfe, ob sie in allen Environments gesetzt sind
- Nach Änderung: Redeploy durchführen

#### 404 Fehler bei Seiten

- Prüfe, ob alle Seiten unter `/web/app/` existieren
- Prüfe Dateinamen (page.tsx erforderlich)

## Support

Bei Fragen oder Problemen:
- Vercel Dokumentation: https://vercel.com/docs
- Next.js Dokumentation: https://nextjs.org/docs
- Support: support@jetzz.app

---

**Status**: Website ist deployment-ready und kann sofort live gehen!
