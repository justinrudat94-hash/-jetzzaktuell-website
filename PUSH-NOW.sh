#!/bin/bash

# JETZZ APP - Quick Push to GitHub
# Dieses Script pusht den kompletten Code zu GitHub

echo "========================================="
echo "JETZZ APP - GitHub Push"
echo "========================================="
echo ""

# Branch umbenennen
echo "Branch wird auf 'main' umbenannt..."
git branch -M main

# Remote hinzufügen (falls noch nicht vorhanden)
echo "Remote Repository wird verbunden..."
git remote remove origin 2>/dev/null
git remote add origin https://github.com/justinrudat94-hash/-jetzzaktuell-website.git

# Push zu GitHub
echo ""
echo "Projekt wird zu GitHub gepusht..."
echo ""
echo "WICHTIG: Wenn nach Authentifizierung gefragt wird:"
echo "- Username: Dein GitHub Username"
echo "- Password: Personal Access Token (NICHT dein Passwort!)"
echo "  Token erstellen: https://github.com/settings/tokens/new"
echo ""

git push -u origin main --force

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✓ ERFOLGREICH!"
    echo "========================================="
    echo ""
    echo "Der Code ist jetzt auf GitHub!"
    echo "Vercel wird automatisch neu deployen!"
    echo ""
    echo "Das Ticket-System ist jetzt vollständig funktionsfähig:"
    echo "- Web: /ticket/[token]"
    echo "- Mobile App: app/ticket/[token].tsx"
    echo ""
else
    echo ""
    echo "========================================="
    echo "✗ FEHLER beim Push"
    echo "========================================="
    echo ""
    echo "Mögliche Lösungen:"
    echo "1. Stelle sicher, dass du ein Personal Access Token verwendest"
    echo "2. Token erstellen: https://github.com/settings/tokens/new"
    echo "3. Scopes: 'repo' muss ausgewählt sein"
    echo ""
fi
