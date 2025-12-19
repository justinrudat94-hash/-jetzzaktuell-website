# 🚀 Deployment-Anleitung

## Schnell-Deployment

Um die Web-Seite zu deployen, führe einfach aus:

```bash
cd web && bash deploy.sh
```

Das Skript führt automatisch folgende Schritte aus:
1. Installation der Dependencies
2. Löschen alter Build-Dateien
3. Neuer Build der Anwendung
4. Export der statischen Dateien

## Was passiert beim Deployment?

Das `deploy.sh` Skript:
- Installiert alle notwendigen npm-Pakete
- Löscht alte Build-Artefakte (`.next` und `out` Ordner)
- Erstellt einen neuen optimierten Production-Build
- Generiert statische HTML/CSS/JS Dateien im `out` Ordner

## Vercel Deployment

Die Anwendung ist so konfiguriert, dass sie automatisch auf Vercel deployed wird:

1. **Automatisches Deployment**: Jeder Push zum Repository triggert ein automatisches Deployment
2. **Statische Dateien**: Die `out` Ordner werden als statische Website gehostet
3. **Output-Modus**: Die Next.js Konfiguration verwendet `output: 'export'` für statische Exports

## Manuelles Vercel Deployment

Falls du manuell deployen möchtest:

```bash
cd web
npm install -g vercel
vercel --prod
```

## Lokale Vorschau

Um die gebaute Website lokal zu testen:

```bash
cd web/out
npx serve
```

Dann öffne `http://localhost:3000` im Browser.

## Projekt-Struktur nach Build

```
web/
├── .next/          # Next.js Build-Cache
├── out/            # Statische Export-Dateien (deployed)
│   ├── index.html
│   ├── _next/
│   │   └── static/
│   └── ...
├── components/     # React-Komponenten
├── lib/            # Utility-Funktionen
└── app/            # Next.js App-Verzeichnis
```

## Wichtige Dateien

- `next.config.js` - Next.js Konfiguration (enthält `output: 'export'`)
- `deploy.sh` - Automatisches Deployment-Skript
- `vercel.json` - Vercel-Deployment-Konfiguration

## Troubleshooting

### Build schlägt fehl

```bash
# Lösche node_modules und installiere neu
rm -rf node_modules package-lock.json
npm install
bash deploy.sh
```

### Änderungen werden nicht sichtbar

```bash
# Harter Reset mit vollständiger Neuinstallation
rm -rf .next out node_modules package-lock.json
npm install
bash deploy.sh
```

### Vercel zeigt alte Version

Vercel cached manchmal aggressiv. Warte 1-2 Minuten oder force-deploye:

```bash
vercel --prod --force
```
