# 🚀 Ticket-System Deployment

## Problem
Die Email-Links funktionieren nicht, weil die Ticket-Route noch nicht deployed ist.

## Lösung: Zu GitHub pushen

### Option 1: Automatisches Script (Empfohlen)
```bash
cd /tmp/cc-agent/58117591/project/web
bash PUSH-TO-GITHUB.sh
```

### Option 2: Manuell
```bash
cd /tmp/cc-agent/58117591/project/web

# Remote hinzufügen
git remote add origin https://github.com/justinrudat94-hash/jetzzaktuell-website.git

# Pushen (du wirst nach Login gefragt)
git push -u origin main --force
```

## Nach dem Push

1. **Warte 2-3 Minuten** - Vercel deployed automatisch
2. **Check Vercel**: https://vercel.com/justin-rudats-projects/web
3. **Teste den Link**: `https://app.jetzzapp.com/ticket/[token]`

## Falls GitHub Login fehlt

### GitHub Token erstellen:
1. https://github.com/settings/tokens
2. "Generate new token (classic)"
3. Scope: `repo` (full control)
4. Token kopieren

### Dann pushen mit Token:
```bash
git push https://YOUR_TOKEN@github.com/justinrudat94-hash/jetzzaktuell-website.git main --force
```

## Alternative: Vercel CLI
Falls GitHub nicht geht:
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## Was wird gefixt?
- ✅ Email-Links zu Tickets funktionieren
- ✅ Ticket-Antworten über Web
- ✅ Live-Updates im Chat
- ✅ Alle Support-Emails funktionieren
