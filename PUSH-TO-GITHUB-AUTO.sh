#!/bin/bash

# JETZZ APP - Automatischer GitHub Push
# Verwendet gespeicherten Token und Config

echo "🚀 Automatischer GitHub Push..."

# Config laden
REPO_URL=$(cat .bolt/github-config.json | grep repository_url | cut -d'"' -f4)
TOKEN=$(cat .github-token | tr -d '\n\r')

# Git initialisieren falls nötig
if [ ! -d .git ]; then
    echo "📦 Git Repository initialisieren..."
    git init
    git config user.name "JETZZ App"
    git config user.email "jetzz@app.local"
    git branch -M main
fi

# Remote hinzufügen/aktualisieren
git remote remove origin 2>/dev/null
git remote add origin "https://${TOKEN}@${REPO_URL#https://}"

# Commit und Push
echo "📝 Änderungen werden commited..."
git add -A
git commit -m "${1:-Update: Automatischer Commit}" || echo "Keine Änderungen zum commiten"

echo "⬆️  Push zu GitHub..."
git push -u origin main --force

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ERFOLGREICH zu GitHub gepusht!"
    echo "🌐 Vercel deployt automatisch..."
else
    echo "❌ Push fehlgeschlagen!"
    exit 1
fi
