# 🧪 Ticketmaster Import Test

## So testest du den Import manuell

### 1. Aktuelle Events prüfen

```bash
node -e "require('dotenv').config(); const {createClient}=require('@supabase/supabase-js'); const s=createClient(process.env.EXPO_PUBLIC_SUPABASE_URL,process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY); s.from('events').select('id',{count:'exact',head:true}).eq('external_source','ticketmaster').then(({count})=>console.log('Aktuelle Ticketmaster Events:',count))"
```

### 2. Import ausführen

```bash
node scripts/ticketmaster-simple-import.js
```

**Das wird importiert:**
- Bis zu 1.000 Events aus Deutschland
- Von der normalen Ticketmaster Discovery API
- Direkt in die `events` Tabelle
- Duplikate werden automatisch übersprungen

**Dauer:** 2-3 Minuten

### 3. Ergebnis prüfen

```bash
node -e "require('dotenv').config(); const {createClient}=require('@supabase/supabase-js'); const s=createClient(process.env.EXPO_PUBLIC_SUPABASE_URL,process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY); s.from('events').select('id',{count:'exact',head:true}).eq('external_source','ticketmaster').then(({count})=>console.log('Ticketmaster Events nach Import:',count))"
```

### 4. Admin UI testen

1. App öffnen
2. Als Admin einloggen
3. Admin Panel → "Ticketmaster Import"
4. Statistiken checken

## Was du sehen solltest

### Beim Import:
```
🎫 Starting Ticketmaster Import...

📄 Fetching page 1...
   Found 200 events
   ✅ Imported 10 events...
   ✅ Imported 20 events...
   ...

📄 Fetching page 2...
   Found 200 events
   ...

============================================================
✅ Import completed!
   Imported: 150
   Skipped: 850
============================================================

📊 Total Ticketmaster events in database: 1770
```

### Im Admin Panel:
- **Gesamt Events**: Anzahl aller Ticketmaster Events
- **Heute**: Neu importierte Events heute
- **Diese Woche**: Events der letzten 7 Tage

## Troubleshooting

### "No events found" oder 0 neue Events
- ✅ NORMAL! Ticketmaster hat keine neuen Events seit letztem Import
- Events werden NUR EINMAL importiert (Duplikate übersprungen)
- Probiere es morgen nochmal

### API Error / Unauthorized
- Check Ticketmaster API Key: `echo $TICKETMASTER_API_KEY`
- Rate Limit erreicht? (5.000 calls/Tag, sollte reichen)
- API Key neu generieren auf Ticketmaster Developer Portal

### Import dauert zu lange
- Normal! Bis zu 1.000 Events werden importiert
- Rate limiting: 1 Sekunde Pause zwischen API calls
- Bei Abbruch: Einfach nochmal starten (Duplikate werden übersprungen)

## Wenn alles funktioniert

### Automatik einrichten (PM2)

```bash
# Installieren
npm install -g pm2

# Täglich um 06:00 Uhr
pm2 start scripts/ticketmaster-simple-import.js \
  --name ticketmaster-daily \
  --cron "0 6 * * *" \
  --no-autorestart

# Speichern & Auto-Start
pm2 save
pm2 startup

# Status prüfen
pm2 list
pm2 logs ticketmaster-daily
```

### Oder mit Cron (Linux/Mac)

```bash
crontab -e

# Diese Zeile einfügen:
0 6 * * * cd /pfad/zum/projekt && node scripts/ticketmaster-simple-import.js >> ticketmaster.log 2>&1
```

## ✅ Fertig!

Das System ist jetzt:
- ✅ **EINFACH** - Nur 1 Script
- ✅ **ZUVERLÄSSIG** - Normale API, keine Edge Functions
- ✅ **GETESTET** - Build erfolgreich, alle Imports entfernt
- ✅ **AUTOMATISIERBAR** - PM2 oder Cron

Bei Fragen siehe `SIMPLE-TICKETMASTER-IMPORT.md` oder `CLEANUP-GUIDE.md`
