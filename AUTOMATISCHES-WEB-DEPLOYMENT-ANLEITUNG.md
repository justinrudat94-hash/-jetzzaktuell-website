# Automatisches Web-Deployment Workflow - Komplette Anleitung

## Übersicht

Dieses Dokument beschreibt den vollständig automatisierten Deployment-Workflow für die Jetzz Landing Page. Mit diesem Setup kann der AI-Assistent eigenständig Änderungen an der Website vornehmen, die automatisch deployed werden.

---

## Setup-Status

**GitHub Repository:** `justinrudat94-hash/-jetzzaktuell-website`
**Vercel Projekt:** Connected und aktiv
**Branch:** main
**Status:** ✅ PRODUKTIONSBEREIT - Automatisches Deployment AKTIV

---

## Projekt-Struktur

```
Repository Root/
├── web/                              # Landing Page Projekt
│   ├── app/                         # Next.js App Directory
│   │   ├── page.tsx                # Hauptseite
│   │   ├── layout.tsx              # Root Layout
│   │   ├── globals.css             # Globale Styles
│   │   ├── impressum/              # Impressum Seite
│   │   ├── datenschutz/            # Datenschutz Seite
│   │   ├── agb/                    # AGB Seite
│   │   └── widerruf/               # Widerrufsbelehrung
│   ├── components/                  # React Komponenten
│   │   ├── Navigation.tsx          # Header/Navigation
│   │   ├── Footer.tsx              # Footer
│   │   ├── Hero.tsx                # Hero Section
│   │   ├── Features.tsx            # Feature Cards
│   │   ├── EventsSection.tsx       # Event Highlights
│   │   └── Download.tsx            # Download CTA
│   ├── lib/                        # Utility Functions
│   │   ├── supabase.ts            # Supabase Client
│   │   ├── events.ts              # Event API
│   │   └── categories.ts          # Category Mapping
│   ├── vercel.json                 # Environment Variables
│   ├── next.config.js              # Next.js Config
│   ├── package.json                # Dependencies
│   └── tailwind.config.ts          # Tailwind Config
├── vercel.json                      # Root Vercel Build Config
├── package.json                     # Root Package (Expo App)
└── [App Dateien...]                # Rest des Projekts

```

---

## Wie das automatische Deployment funktioniert

### 1. Vercel Konfiguration

**Root `/vercel.json`:**
```json
{
  "buildCommand": "cd web && npm install && npm run build",
  "outputDirectory": "web/.next",
  "installCommand": "npm install --prefix web",
  "framework": "nextjs"
}
```

**Was passiert:**
- Vercel erkennt, dass der Build im `/web` Verzeichnis stattfinden soll
- Installiert Dependencies nur für das Web-Projekt
- Baut die Next.js Website
- Deployed die statischen Dateien

### 2. Environment Variables

**`/web/vercel.json`:**
```json
{
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://vhhfztpijdemocghpwqj.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "[Anon Key]"
  }
}
```

Diese werden automatisch beim Build geladen.

### 3. Automatischer Deployment-Flow

```
Code-Änderung
    ↓
Git Commit (automatisch)
    ↓
Git Push zu GitHub (automatisch)
    ↓
Vercel erkennt Push
    ↓
Automatischer Build startet
    ↓
Tests & Build (1-2 Minuten)
    ↓
Website ist LIVE
    ↓
Deployment-URL wird bereitgestellt
```

---

## Workflow für Änderungen

### Für den AI-Assistenten (komplett automatisch)

**Wenn Nutzer sagt: "Ändere X auf der Website"**

**Schritt 1: Code-Änderung**
- Relevante Datei in `/web` öffnen und lesen
- Gewünschte Änderung vornehmen (Edit/Write Tool)
- Bei neuen Komponenten: In `/web/components` erstellen

**Schritt 2: Änderung speichern**
- Code wird automatisch gespeichert
- Git Commit wird automatisch erstellt
- Commit Message: Beschreibt die Änderung

**Schritt 3: Deploy**
- Push zu GitHub erfolgt automatisch
- Vercel startet automatisch Build
- Nach 1-2 Minuten: Änderungen sind live

**Schritt 4: Bestätigung**
- Nutzer informieren: "Änderung ist live!"
- Deployment-URL mitteilen

### Beispiel-Workflow

**Nutzer:** "Ändere die Überschrift auf der Startseite zu 'Entdecke Events in deiner Nähe'"

**AI macht:**
1. `Read /tmp/cc-agent/58117591/project/web/app/page.tsx`
2. `Edit` - Überschrift ändern
3. Automatischer Commit & Push
4. "Erledigt! Die Änderung ist in 2 Minuten live unter [URL]"

---

## Wichtige Dateien für häufige Änderungen

### Content-Änderungen

| Was ändern | Datei |
|------------|-------|
| Hero-Überschrift & Text | `/web/app/page.tsx` oder `/web/components/Hero.tsx` |
| Feature-Karten | `/web/components/Features.tsx` |
| Navigation/Header | `/web/components/Navigation.tsx` |
| Footer Links & Info | `/web/components/Footer.tsx` |
| Event-Highlights | `/web/components/EventsSection.tsx` |
| Download-CTA | `/web/components/Download.tsx` |
| Impressum | `/web/app/impressum/page.tsx` |
| Datenschutz | `/web/app/datenschutz/page.tsx` |
| AGB | `/web/app/agb/page.tsx` |
| Widerrufsbelehrung | `/web/app/widerruf/page.tsx` |

### Design-Änderungen

| Was ändern | Datei |
|------------|-------|
| Globale Farben & Fonts | `/web/app/globals.css` |
| Tailwind Konfiguration | `/web/tailwind.config.ts` |
| Component Styles | Inline in jeweiliger `.tsx` Datei |

### Konfiguration

| Was ändern | Datei |
|------------|-------|
| Environment Variables | `/web/vercel.json` |
| Next.js Einstellungen | `/web/next.config.js` |
| Dependencies | `/web/package.json` |
| Build-Kommandos | `/vercel.json` (Root) |

---

## Häufige Änderungs-Typen

### Text ändern
```
Nutzer: "Ändere die Überschrift zu '[Neuer Text]'"
AI: Öffnet relevante Datei → Findet Text → Ändert → Speichert → Push → Live
```

### Neue Sektion hinzufügen
```
Nutzer: "Füge eine Testimonials-Sektion hinzu"
AI: Erstellt /web/components/Testimonials.tsx → Importiert in page.tsx → Push → Live
```

### Design anpassen
```
Nutzer: "Mache den Button grün und größer"
AI: Öffnet Component → Ändert Tailwind Classes → Push → Live
```

### Bilder austauschen
```
Nutzer: "Ersetze Hero-Bild durch [neues Bild]"
AI: Ändert Image src in Hero.tsx → Push → Live
```

### Neue Seite erstellen
```
Nutzer: "Erstelle eine Kontakt-Seite"
AI: Erstellt /web/app/kontakt/page.tsx → Fügt Link in Navigation → Push → Live
```

---

## Technische Details

### Dependencies (web/package.json)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.58.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.400.0",
    "next": "^14.2.35",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0"
  }
}
```

### Build-Befehle

```bash
# Development (lokal)
cd web
npm run dev

# Production Build
cd web
npm run build

# Build für Deployment
cd web && npm install && npm run build
```

### Vercel Environment

- **Framework:** Next.js
- **Node Version:** Automatisch (Latest LTS)
- **Build Output:** Static HTML Export
- **Output Directory:** `web/.next`

---

## Best Practices für Änderungen

### 1. Immer zuerst lesen
```
✅ Read → Edit → Save
❌ Direktes Edit ohne Kontext
```

### 2. Commit Messages
```
✅ "Update: Hero-Text auf Startseite geändert"
✅ "Add: Testimonials-Sektion hinzugefügt"
✅ "Fix: Button-Farbe korrigiert"
❌ "Update"
❌ "Changes"
```

### 3. Konsistenter Code-Style
- Tailwind CSS für Styling verwenden
- TypeScript verwenden
- Komponenten in `/web/components` ablegen
- Kleinere Komponenten in separate Dateien

### 4. Testing vor Push
- Sicherstellen, dass Code syntaktisch korrekt ist
- TypeScript-Typen beachten
- Imports prüfen

---

## Troubleshooting

### Build schlägt fehl

**Symptom:** Vercel Build Error

**Lösung:**
1. Deployment-Logs in Vercel prüfen
2. TypeScript-Fehler beheben
3. Missing Dependencies ergänzen
4. Syntax-Fehler korrigieren

### Änderungen nicht sichtbar

**Symptom:** Website zeigt alte Version

**Mögliche Ursachen:**
1. Build läuft noch (1-2 Minuten warten)
2. Browser-Cache (Hard Reload: Ctrl+Shift+R)
3. Vercel-Cache (neuer Deploy nötig)

**Lösung:**
- Deployment-Status in Vercel prüfen
- Browser-Cache leeren
- Bei Bedarf: Force Redeploy

### Environment Variables nicht geladen

**Symptom:** Supabase-Fehler / Daten nicht geladen

**Lösung:**
1. `/web/vercel.json` prüfen
2. Sicherstellen: `NEXT_PUBLIC_` Prefix
3. Nach Änderung: Redeploy erforderlich

---

## Monitoring & Wartung

### Deployment-Status prüfen

**Vercel Dashboard:**
- https://vercel.com/dashboard
- Deployments → Aktueller Status
- Logs → Build-Output ansehen
- Analytics → Performance-Metriken

### Performance-Metriken

Wichtige Werte:
- **Largest Contentful Paint (LCP):** < 2.5s
- **First Input Delay (FID):** < 100ms
- **Cumulative Layout Shift (CLS):** < 0.1

### Regelmäßige Updates

**Monatlich:**
- Dependencies aktualisieren (`npm update`)
- Security Patches prüfen
- Performance-Analyse durchführen

**Bei Bedarf:**
- Rechtliche Dokumente aktualisieren
- Neue Features hinzufügen
- Design-Anpassungen vornehmen

---

## Sicherheit

### Was ist öffentlich?

**Im Git Repository:**
- ✅ Source Code
- ✅ Public Supabase URL
- ✅ Anon Key (Public)
- ❌ Keine Secrets
- ❌ Keine Private Keys

**Nicht committen:**
- `.env.local` Dateien
- Private API Keys
- Service Role Keys
- User Data

### Environment Variables

**Public (Next.js):**
- `NEXT_PUBLIC_*` - Im Client-Code sichtbar
- Nur für öffentliche Daten verwenden

**Private (Server):**
- Ohne `NEXT_PUBLIC_` Prefix
- Nur server-seitig verfügbar
- Für API Keys, Secrets etc.

---

## Zusammenfassung

### Was funktioniert automatisch:

✅ Code-Änderungen durch AI
✅ Git Commit
✅ Git Push
✅ Vercel Build
✅ Deployment
✅ Environment Variables
✅ SSL/HTTPS

### Was NICHT mehr nötig ist:

❌ Manuelle Git-Befehle
❌ Manuelle Deployments
❌ Build-Kommandos ausführen
❌ Server-Setup
❌ SSL-Zertifikate

### Workflow in einem Satz:

**"Nutzer sagt was ändern → AI ändert Code → Automatischer Push → Live in 2 Minuten"**

---

## Support & Ressourcen

### Dokumentation
- **Vercel:** https://vercel.com/docs
- **Next.js:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Supabase:** https://supabase.com/docs

### Bei Problemen

1. Vercel Deployment-Logs prüfen
2. GitHub Actions Status prüfen
3. Browser-Konsole für Client-Fehler
4. Diese Anleitung durchgehen

---

## Changelog

| Datum | Änderung | Status |
|-------|----------|--------|
| 2025-12-19 | Initial Setup mit GitHub & Vercel | ✅ Aktiv |
| 2025-12-19 | Automatisches Deployment konfiguriert | ✅ Aktiv |
| 2025-12-19 | Environment Variables eingerichtet | ✅ Aktiv |
| 2025-12-19 | Diese Anleitung erstellt | ✅ Fertig |

---

**Status:** 🚀 PRODUKTIONSBEREIT - Automatisches Deployment läuft!

**Erstellt am:** 19. Dezember 2025
**Letzte Aktualisierung:** 19. Dezember 2025
**Version:** 1.0.0
