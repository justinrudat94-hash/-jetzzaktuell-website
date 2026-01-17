# 🚀 Schnelles Deployment

## Website deployen

Um die Website zu bauen und zu deployen, führe einfach aus:

```bash
./deploy-web.sh
```

Das war's! Das Skript kümmert sich um alles:
- Installiert Dependencies
- Löscht alte Builds
- Baut die Website neu
- Erstellt statische Dateien für Vercel

## Was wurde geändert?

Die Website zeigt jetzt im Hero-Bereich einen Event-Carousel anstelle des großen Bildes:

### Änderungen:
1. **Neue Funktion in `web/lib/events.ts`**:
   - `getMixedHeroEvents()` - Lädt abwechselnd Highlight-Events und normale Events

2. **Hero-Komponente aktualisiert**:
   - Bild entfernt
   - Event-Slider integriert
   - Automatische Rotation alle 5,5 Sekunden
   - 3 Events gleichzeitig sichtbar (responsive)

3. **Event-Slider-Timing**:
   - Von 8 Sekunden auf 5,5 Sekunden reduziert

## Vercel Deployment

Die Änderungen werden automatisch auf Vercel deployed, sobald du sie zu GitHub pushst:

```bash
git add .
git commit -m "Hero mit Event-Carousel implementiert"
git push
```

## Lokale Vorschau

Um die Website lokal anzusehen:

```bash
cd web
npm run dev
```

Dann öffne `http://localhost:3000`

## Weitere Informationen

Siehe `web/DEPLOY-README.md` für detaillierte Informationen zum Deployment-Prozess.
