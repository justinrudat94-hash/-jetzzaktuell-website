#!/bin/bash

# Deployment-Skript für die Jetzz Web-Seite

set -e

echo "🚀 Starte Deployment..."

# Farben für Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Dependencies installieren
echo -e "${YELLOW}📦 Installiere Dependencies...${NC}"
npm install

# 2. Alte Build-Dateien löschen
echo -e "${YELLOW}🗑️  Lösche alte Build-Dateien...${NC}"
rm -rf .next out

# 3. Projekt bauen (erstellt automatisch den 'out' Ordner mit statischen Dateien)
echo -e "${YELLOW}🔨 Baue Projekt...${NC}"
npm run build

echo -e "${GREEN}✅ Build erfolgreich abgeschlossen!${NC}"
echo ""
echo "Die statischen Dateien befinden sich im 'out' Ordner."
echo "Deployment wird automatisch auf Vercel durchgeführt."
