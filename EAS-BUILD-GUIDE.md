# EAS Build Setup Guide für JETZZ App

Diese Anleitung führt dich Schritt für Schritt durch den EAS Build-Prozess für deine JETZZ App.

## Voraussetzungen

- Expo Account (kostenlos bei expo.dev)
- Projekt lokal auf deinem Computer
- Node.js und npm installiert

## Schritt 1: EAS CLI installieren

```bash
npm install -g eas-cli
```

## Schritt 2: Bei Expo anmelden

```bash
eas login
```

Gib deine Expo Account-Credentials ein oder erstelle einen neuen Account.

## Schritt 3: Projekt mit EAS verknüpfen

Im Projektverzeichnis ausführen:

```bash
eas build:configure
```

Dieser Befehl:
- Verknüpft dein Projekt mit deinem Expo Account
- Die `eas.json` wurde bereits erstellt und ist fertig konfiguriert

## Schritt 4: Development Build erstellen

### Für Android:

```bash
eas build --platform android --profile development
```

### Für iOS (benötigt Apple Developer Account):

```bash
eas build --platform ios --profile development
```

### Für beide Plattformen:

```bash
eas build --platform all --profile development
```

## Schritt 5: Build-Prozess

1. EAS wird dich nach einigen Infos fragen:
   - Android: Package Name bestätigen (com.jetzz.app)
   - iOS: Bundle Identifier bestätigen (com.jetzz.app)
   - Ob du einen neuen Keystore generieren möchtest (Ja für Android)

2. Der Build läuft auf Expo-Servern (dauert ca. 10-20 Minuten)

3. Du erhältst eine Build-URL wo du den Fortschritt verfolgen kannst

## Schritt 6: App installieren

### Android:
- Lade die APK-Datei herunter (Link in der Build-Übersicht)
- Übertrage sie auf dein Android-Gerät
- Installiere die APK (evtl. "Unbekannte Quellen" erlauben)

### iOS:
- Registriere dein Testgerät in deinem Apple Developer Account
- Lade die App über TestFlight oder den direkten Download-Link

## Schritt 7: App starten und testen

1. Starte die Development Build App auf deinem Gerät
2. Im Terminal deines Projekts: `npm start`
3. Scanne den QR-Code mit der Development Build App
4. Die App lädt und du kannst sie testen

## Weitere Build-Profile

### Preview Build (für Tester):
```bash
eas build --platform android --profile preview
```

### Production Build (für Store-Veröffentlichung):
```bash
eas build --platform android --profile production
```

## Wichtige Hinweise

### Development Build:
- Perfekt für Entwicklung und Testing
- Enthält Expo Dev Client
- Du kannst live Code-Änderungen laden
- Größere Dateigröße

### Preview Build:
- Für Beta-Tester
- Keine Dev-Tools
- Kleinere Dateigröße

### Production Build:
- Für App Store / Play Store
- Optimiert und minimiert
- Keine Debug-Funktionen

## Troubleshooting

### "eas: command not found"
```bash
npm install -g eas-cli
```

### Build schlägt fehl
- Prüfe ob alle Dependencies in package.json korrekt sind
- Stelle sicher dass app.json/app.config.js korrekt konfiguriert ist
- Checke die Build-Logs für spezifische Fehler

### Android Keystore Probleme
Bei erneutem Build mit bestehendem Keystore:
```bash
eas build --platform android --profile development --clear-cache
```

## Nützliche Befehle

```bash
# Build-Status anzeigen
eas build:list

# Build-Details anzeigen
eas build:view [build-id]

# Credentials verwalten
eas credentials

# Projekt-Konfiguration anzeigen
eas config
```

## Kostenübersicht

- Development Builds: Im Free-Tier enthalten
- Production Builds: Begrenzte Anzahl kostenlos, dann kostenpflichtig
- Mehr Infos: https://expo.dev/pricing

## Weitere Ressourcen

- Offizielle Docs: https://docs.expo.dev/build/introduction/
- EAS Build Workflows: https://docs.expo.dev/build/eas-json/
- Troubleshooting: https://docs.expo.dev/build-reference/troubleshooting/

## Support

Bei Fragen oder Problemen:
- Expo Discord: https://chat.expo.dev
- Expo Forums: https://forums.expo.dev
- GitHub Issues: https://github.com/expo/expo/issues
