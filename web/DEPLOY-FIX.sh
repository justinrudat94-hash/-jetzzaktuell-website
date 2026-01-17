#!/bin/bash
# Vercel Deployment Fix Script
# Dieses Script deployed die Web-App neu ohne Build-Cache

echo "🚀 Starte Vercel Deployment ohne Cache..."
echo ""
echo "⚠️  WICHTIG: Du musst bei Vercel eingeloggt sein!"
echo ""

# Check if vercel is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx nicht gefunden! Bitte installiere Node.js."
    exit 1
fi

# Navigate to web directory
cd "$(dirname "$0")"

echo "📁 Aktuelles Verzeichnis: $(pwd)"
echo ""

# Check if .vercel directory exists
if [ -d ".vercel" ]; then
    echo "✓ Vercel Projekt gefunden"
else
    echo "⚠️  Keine .vercel Konfiguration gefunden."
    echo "   Du musst dich zuerst mit 'npx vercel' einloggen und das Projekt verknüpfen."
    echo ""
    read -p "Möchtest du das jetzt tun? (j/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Jj]$ ]]; then
        npx vercel
    else
        echo "Abgebrochen."
        exit 1
    fi
fi

# Deploy to production
echo ""
echo "🚀 Deploying zu Production..."
echo "   (Build-Cache wird automatisch umgangen durch neue Änderungen)"
echo ""

npx vercel --prod --force

echo ""
echo "✅ Deployment abgeschlossen!"
echo ""
echo "🔗 Öffne dein Vercel Dashboard um das Deployment zu überwachen:"
echo "   https://vercel.com/dashboard"
echo ""
