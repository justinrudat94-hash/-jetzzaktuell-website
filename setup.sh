#!/bin/bash

# JETZZ App - Komplettes Setup Script
# Führen Sie dieses Script aus, um die App lokal aufzubauen

echo "🚀 JETZZ App Setup wird gestartet..."

# 1. Neues Expo-Projekt erstellen
echo "📱 Erstelle neues Expo-Projekt..."
npx create-expo-app@latest jetzz-app --template blank-typescript --yes
cd jetzz-app

# 2. Dependencies installieren
echo "📦 Installiere Dependencies..."
npm install expo-router@~4.0.17
npm install expo-constants@~17.0.3
npm install expo-linking@~7.0.3
npm install expo-splash-screen@~0.29.16
npm install expo-status-bar@~2.0.0
npm install expo-system-ui@~4.0.4
npm install lucide-react-native@^0.400.0
npm install react-native-safe-area-context@4.12.0
npm install react-native-screens@4.1.0

# 3. Expo Router konfigurieren
echo "⚙️ Konfiguriere Expo Router..."

# app.json aktualisieren
cat > app.json << 'EOF'
{
  "expo": {
    "name": "JETZZ",
    "slug": "jetzz-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#8B5CF6"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#8B5CF6"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-router"
    ],
    "experiments": {
      "typedRoutes": true
    },
    "scheme": "jetzz"
  }
}
EOF

# 4. TypeScript konfigurieren
cat > tsconfig.json << 'EOF'
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
EOF

# 5. Metro konfigurieren
cat > metro.config.js << 'EOF'
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  '@': __dirname,
};

module.exports = config;
EOF

# 6. Ordnerstruktur erstellen
echo "📁 Erstelle Ordnerstruktur..."
mkdir -p app/\(tabs\)
mkdir -p app/event
mkdir -p components/ui
mkdir -p hooks
mkdir -p utils
mkdir -p constants
mkdir -p types
mkdir -p data

# 7. Alte Dateien entfernen
rm -f App.tsx
rm -f app.json.backup 2>/dev/null || true

echo "✅ Basis-Setup abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo "1. Kopieren Sie alle Dateien aus Bolt in die entsprechenden Ordner"
echo "2. Führen Sie 'npm start' aus"
echo "3. Die App läuft auf http://localhost:8081"
echo ""
echo "📁 Ordnerstruktur:"
echo "├── app/              # Screens"
echo "├── components/       # UI Komponenten"  
echo "├── hooks/           # Custom Hooks"
echo "├── utils/           # Utility Funktionen"
echo "├── constants/       # Farben, Spacing"
echo "├── types/           # TypeScript Typen"
echo "└── data/            # Mock Daten"
echo ""
echo "🎉 Setup erfolgreich! Viel Spaß mit JETZZ! 🚀"