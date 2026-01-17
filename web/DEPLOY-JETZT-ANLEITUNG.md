# 🚀 TICKET-SEITE FIX - DEPLOYMENT ANLEITUNG

## Das Problem
Die Ticket-Seite zeigt nur "Ticket" + Token, weil Next.js im falschen Modus läuft.

## Die Lösung
`output: 'standalone'` wurde aus `web/next.config.js` entfernt.

## Geänderte Dateien
- ✅ `web/next.config.js` - Standalone-Modus entfernt
- ✅ `web/FIX-TICKET-SSR.sh` - Deploy-Script erstellt

## JETZT DEPLOYEN

### Option 1: Git Push (wenn Git Repo vorhanden)
```bash
cd /pfad/zu/projekt
git add web/next.config.js web/FIX-TICKET-SSR.sh
git commit -m "fix: Ticket-Seite SSR für Vercel"
git push
```

Vercel deployed automatisch in 2-3 Minuten.

### Option 2: Manuelles Vercel Deployment
1. Öffne: https://vercel.com/justin-rudals-projects/web
2. Klicke auf "Deployments"
3. Klicke oben rechts auf "Deploy" Button
4. Wähle den Branch "main"
5. Klicke "Deploy"

### Option 3: Vercel CLI
```bash
cd web
npm install -g vercel
vercel --prod
```

## Nach dem Deployment
1. Warte 2-3 Minuten
2. Öffne: https://app.jetzzapp.com/ticket/466089b2-a725-4871-b776-da13bcccfc28
3. Hard-Refresh: **STRG + SHIFT + R** (Windows) oder **CMD + SHIFT + R** (Mac)

Die Seite sollte jetzt das volle Chat-Interface zeigen!

## Build-Log Check
Im Build-Log sollte stehen:
```
✓ Compiled successfully
Route (app)
├ ƒ /ticket/[token]    (Dynamic) ← WICHTIG: ƒ = Dynamic SSR!
```

Wenn dort ○ steht (Static), ist es FALSCH!
