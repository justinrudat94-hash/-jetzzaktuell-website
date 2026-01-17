# Ticket-Seite Fix - Deployment Anleitung

## Problem
Die Ticket-Seite zeigt nur "Token: ..." anstatt den vollständigen Ticket-Chat.

## Ursache
Next.js hat die Seite als **statische Seite** gebaut, aber sie braucht **Server-Side Rendering** für dynamische Parameter.

## Lösung
Die Seite wurde angepasst:
- `export const dynamic = 'force-dynamic'` hinzugefügt
- `export const revalidate = 0` für Echtzeit-Updates
- Next.js Config auf `output: 'standalone'` geändert

## Deployment

### Option 1: Automatisches Deployment (Empfohlen)
```bash
cd web
./DEPLOY-TICKET-FIX.sh
```

### Option 2: Manuelles Deployment
```bash
cd web

# Git initialisieren (falls noch nicht geschehen)
git init
git remote add origin https://github.com/justin-rud/jetzz-website.git

# Änderungen committen
git add app/ticket/[token]/page.tsx next.config.js
git commit -m "Fix: Enable dynamic rendering for ticket pages"

# Pushen
git branch -M main
git push -u origin main --force
```

### Option 3: Vercel Redeploy
1. Gehe zu: https://vercel.com/justin-rudals-projects/web/deployments
2. Klicke auf das neueste Deployment
3. Klicke auf "..." → "Redeploy"
4. Bestätige

## Nach dem Deployment
Überprüfe die Seite nach 2-3 Minuten:
https://app.jetzzapp.com/ticket/466089b2-a725-4871-b776-da13bcccfc28

Die Seite sollte jetzt:
- ✅ Vollständigen Ticket-Chat anzeigen
- ✅ Support-Nachrichten laden
- ✅ Antworten-Formular zeigen
- ✅ Echtzeit-Updates erhalten
