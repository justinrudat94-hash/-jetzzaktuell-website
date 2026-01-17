#!/bin/bash

echo "🚀 Pushing Ticket System to GitHub..."
echo ""
echo "⚠️  Du brauchst:"
echo "   1. Zugriff zum GitHub Repository 'jetzzaktuell-website'"
echo "   2. GitHub Token oder SSH Key"
echo ""

# GitHub Repository URL (anpassen falls nötig)
REPO_URL="https://github.com/justinrudat94-hash/jetzzaktuell-website.git"

# Remote hinzufügen
if git remote get-url origin 2>/dev/null; then
    echo "✓ Remote 'origin' existiert bereits"
    git remote set-url origin $REPO_URL
else
    echo "➕ Füge Remote 'origin' hinzu..."
    git remote add origin $REPO_URL
fi

# Pushen
echo ""
echo "📤 Pushe zu GitHub..."
git push -u origin main --force

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Erfolgreich gepusht!"
    echo "🔄 Vercel deployed automatisch in ca. 2-3 Minuten"
    echo "🌐 Danach funktioniert: https://app.jetzzapp.com/ticket/[token]"
else
    echo ""
    echo "❌ Push fehlgeschlagen!"
    echo ""
    echo "Mögliche Lösungen:"
    echo "1. GitHub Token erstellen: https://github.com/settings/tokens"
    echo "2. Oder SSH Key verwenden: https://docs.github.com/en/authentication"
    echo ""
    echo "Dann nochmal ausführen: bash PUSH-TO-GITHUB.sh"
fi
