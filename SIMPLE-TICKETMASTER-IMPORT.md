# ✅ EINFACHES TICKETMASTER IMPORT SYSTEM

## Das Problem

Alle komplizierten Systeme funktionieren NICHT:
- ❌ Discovery Feed: API Authorization failed
- ❌ n8n Integration: Zu komplex
- ❌ Eventbrite: Nicht benötigt
- ❌ Auto-Events: Funktioniert nicht zuverlässig

## Die Lösung

**NUR noch Ticketmaster Regular API** - einfach, zuverlässig, funktioniert!

## 🚀 Wie es funktioniert

### 1. Manueller Import (sofort Events holen)

```bash
node scripts/ticketmaster-simple-import.js
```

**Das macht es:**
- Holt bis zu 1.000 Events aus Deutschland
- Speichert sie DIREKT in die `events` Tabelle (keine scraped_events mehr!)
- Überspringt Duplikate automatisch
- Läuft in 2-3 Minuten durch

### 2. Automatischer Import (jeden Tag neue Events)

**Mit Cron (Linux/Mac):**
```bash
# Einmal am Tag um 06:00 Uhr
crontab -e
# Dann einfügen:
0 6 * * * cd /pfad/zum/projekt && node scripts/ticketmaster-simple-import.js >> ticketmaster-import.log 2>&1
```

**Mit PM2 (empfohlen):**
```bash
# Installieren
npm install -g pm2

# Jeden Tag um 06:00 Uhr
pm2 start scripts/ticketmaster-simple-import.js --name ticketmaster-import --cron "0 6 * * *" --no-autorestart

# Status checken
pm2 list
pm2 logs ticketmaster-import
```

**Mit Windows Task Scheduler:**
1. Task Scheduler öffnen
2. "Create Basic Task"
3. Trigger: Daily, 06:00
4. Action: Start Program
5. Program: `node`
6. Arguments: `C:\pfad\zum\projekt\scripts\ticketmaster-simple-import.js`

## 📊 Was wird importiert

- **Quelle**: Ticketmaster Discovery API
- **Region**: Deutschland (countryCode=DE)
- **Anzahl**: Bis zu 1.000 Events
- **Sortierung**: Nach Datum (kommende Events zuerst)
- **Duplikate**: Werden automatisch übersprungen

## ⚙️ Konfiguration

Im Script kannst du anpassen:

```javascript
const size = 200;  // Events pro API call (max 200)
while (page < 5) { // Max 5 Seiten = 1.000 Events
```

## 🗑️ Was wurde entfernt

Alle folgenden Dateien/Features können GELÖSCHT werden:

### Edge Functions (funktionieren nicht zuverlässig)
- `supabase/functions/download-ticketmaster-feed/`
- `supabase/functions/fetch-eventbrite-events/`
- `supabase/functions/eventbrite-oauth-callback/`
- `supabase/functions/scrape-events/`
- `supabase/functions/n8n-db-proxy/`

### Scripts (zu komplex)
- `scripts/publish_scraped_events.js`
- `auto-import-worker.js`
- `n8n-supabase-workflow.json`

### Admin Pages (nicht benötigt)
- `app/admin/eventbrite.tsx`
- `app/admin/auto-events.tsx`
- `app/admin/scheduler.tsx`

### Services (nicht benötigt)
- `services/eventbriteService.ts`
- `services/autoEventService.ts`
- `services/autoImportService.ts`
- `services/schedulerService.ts`
- `services/ticketmasterFeedService.ts`

## ✅ Was bleibt

### EINFACH & FUNKTIONIERT:
1. **`scripts/ticketmaster-simple-import.js`** - Der einzige Import der läuft!
2. **`app/admin/ticketmaster.tsx`** - Vereinfachte Admin Page (nur Import Button)
3. **Cron Job / PM2** - Automatisierung

## 🎯 Quick Start

```bash
# 1. Einmal manuell testen
node scripts/ticketmaster-simple-import.js

# 2. Mit PM2 automatisieren (jeden Tag 06:00)
pm2 start scripts/ticketmaster-simple-import.js \
  --name ticketmaster-daily \
  --cron "0 6 * * *" \
  --no-autorestart

# 3. Fertig! ✅
```

## 📝 Logs

```bash
# PM2 Logs anschauen
pm2 logs ticketmaster-daily

# Oder manuell
node scripts/ticketmaster-simple-import.js >> import.log 2>&1
tail -f import.log
```

## 🔧 Troubleshooting

**Import läuft nicht:**
```bash
# API Key checken
echo $TICKETMASTER_API_KEY

# .env laden
source .env
echo $TICKETMASTER_API_KEY
```

**Keine neuen Events:**
- Ticketmaster hat möglicherweise keine neuen Events
- Events werden nur EINMAL importiert (Duplikate übersprungen)
- Rate Limit: 5.000 API calls pro Tag (reicht locker!)

## 🎉 Fertig!

Das System ist jetzt:
- ✅ EINFACH (nur 1 Script)
- ✅ ZUVERLÄSSIG (normale API, keine Edge Functions)
- ✅ AUTOMATISCH (Cron / PM2)
- ✅ WARTBAR (1 Datei, keine Komplexität)

**Keine Discovery Feeds, keine scraped_events, keine Edge Functions - einfach NUR das was funktioniert!**
