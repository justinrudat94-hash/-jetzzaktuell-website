#!/bin/bash

# Master Deployment-Skript für die Jetzz Web-Seite
# Dieses Skript kann vom Root-Verzeichnis aus ausgeführt werden

set -e

# Farben für Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Jetzz Web Deployment Script         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Wechsel ins web-Verzeichnis
cd "$(dirname "$0")/web"

echo -e "${YELLOW}📂 Arbeitsverzeichnis: $(pwd)${NC}"
echo ""

# Führe das Deploy-Skript aus
bash deploy.sh

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ Deployment abgeschlossen! ✨${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "Die Website wurde erfolgreich gebaut und ist bereit für Vercel."
echo -e "Push deine Änderungen zu GitHub, um das automatische Deployment zu triggern."
