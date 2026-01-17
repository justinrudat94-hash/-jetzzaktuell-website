# GitHub Push und Vercel Deployment - Schritt für Schritt

## ✅ Was bereits erledigt wurde:
- Git Repository initialisiert
- .gitignore konfiguriert
- Web-Projekt ist build-ready

## 🚀 Nächste Schritte:

### 1. GitHub Repository erstellen
1. Gehe zu https://github.com/new
2. Repository Name: `jetzz-app` (oder beliebiger Name)
3. **WICHTIG:** Wähle **PRIVATE** wenn du das Projekt privat halten willst
4. **NICHT** "Initialize with README" anklicken
5. Klicke "Create repository"
6. **Kopiere die Repository-URL** (z.B. `https://github.com/DeinUsername/jetzz-app.git`)

### 2. Code zu GitHub pushen

Öffne PowerShell oder Git Bash im Projekt-Ordner (`C:\Users\User\OneDrive\LMD\Desktop\Jetzz APP\repo_test_123`) und führe diese Befehle aus:

```bash
# Branch auf main umbenennen (empfohlen)
git branch -M main

# Alle Dateien hinzufügen
git add .

# Ersten Commit erstellen
git commit -m "Initial commit - Jetzz Event Platform"

# GitHub Repository verbinden (ERSETZE mit deiner URL!)
git remote add origin https://github.com/DeinUsername/jetzz-app.git

# Code zu GitHub pushen
git push -u origin main
```

**Falls Authentifizierung gefragt wird:**
- Username: Dein GitHub Username
- Password: **NICHT** dein GitHub Passwort, sondern ein **Personal Access Token**
- Token erstellen: https://github.com/settings/tokens/new (Scopes: repo)

### 3. Vercel Deployment (OHNE npx!)

#### Option A: Vercel Dashboard (EINFACHSTE Methode)
1. Gehe zu https://vercel.com/login
2. Melde dich mit GitHub an
3. Klicke "Add New Project"
4. Klicke "Import Git Repository"
5. Wähle dein `jetzz-app` Repository
6. **WICHTIG:** Setze "Root Directory" auf `web`
7. Framework wird automatisch als "Next.js" erkannt
8. Klicke "Deploy"

#### Option B: Vercel CLI mit npm (falls du npm hast)
```bash
# In den web Ordner wechseln
cd web

# Vercel mit npm installieren (statt npx)
npm install -g vercel

# Deployment starten
vercel

# Production Deployment
vercel --prod
```

### 4. Environment Variables auf Vercel konfigurieren

Nach dem ersten Deployment:

1. Gehe zu deinem Projekt auf Vercel
2. Klicke auf "Settings"
3. Klicke auf "Environment Variables"
4. Füge folgende Variablen hinzu:

```
NEXT_PUBLIC_SUPABASE_URL = [Deine Supabase URL aus web/.env]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [Dein Supabase Anon Key aus web/.env]
```

5. Klicke "Save"
6. Gehe zu "Deployments"
7. Klicke auf das neueste Deployment → "..." → "Redeploy"

### 5. Domain konfigurieren (Optional)

1. In Vercel Project Settings → "Domains"
2. Füge deine Domain hinzu
3. Folge den DNS-Anweisungen

## 🎉 Fertig!

Deine App ist jetzt online unter: `https://dein-projekt-name.vercel.app`

## 📝 Wichtige Hinweise:

- **Niemals** die `.env` Datei zu GitHub pushen (ist bereits in .gitignore)
- Environment Variables IMMER über Vercel Dashboard setzen
- Bei Änderungen: `git add . && git commit -m "message" && git push`
- Vercel deployt automatisch bei jedem Push zu GitHub

## 🔧 Bei Problemen:

**Git Push funktioniert nicht?**
- Stelle sicher, dass du einen Personal Access Token verwendest
- Prüfe die Remote URL: `git remote -v`

**Vercel Build schlägt fehl?**
- Stelle sicher, dass Root Directory auf `web` gesetzt ist
- Prüfe die Environment Variables
- Schaue in die Build Logs für Details

**Website lädt nicht?**
- Prüfe Browser Console (F12)
- Prüfe Supabase Connection
- Prüfe Environment Variables
