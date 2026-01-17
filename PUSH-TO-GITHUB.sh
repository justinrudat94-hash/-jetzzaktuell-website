#!/bin/bash

# JETZZ APP - GitHub Push Script
# Dieses Script pusht dein Projekt zu GitHub

echo "========================================="
echo "JETZZ APP - GitHub Push"
echo "========================================="
echo ""

# Schritt 1: GitHub Repository URL eingeben
echo "Schritt 1: Erstelle zuerst ein Repository auf GitHub:"
echo "- Gehe zu: https://github.com/new"
echo "- Repository Name: jetzz-app (oder beliebiger Name)"
echo "- Wähle: Private oder Public"
echo "- NICHT 'Initialize with README' anklicken"
echo "- Klicke 'Create repository'"
echo ""
read -p "Hast du das Repository erstellt? (j/n): " created

if [ "$created" != "j" ]; then
    echo "Bitte erstelle zuerst das Repository auf GitHub!"
    exit 1
fi

echo ""
read -p "Gib die Repository URL ein (z.B. https://github.com/username/jetzz-app.git): " repo_url

# Branch auf main umbenennen
echo ""
echo "Branch wird auf 'main' umbenannt..."
git branch -M main

# Remote hinzufügen
echo "Remote Repository wird verbunden..."
git remote add origin "$repo_url"

# Push zu GitHub
echo ""
echo "Projekt wird zu GitHub gepusht..."
echo "WICHTIG: Wenn nach Authentifizierung gefragt wird:"
echo "- Username: Dein GitHub Username"
echo "- Password: Personal Access Token (NICHT dein Passwort!)"
echo "  Token erstellen: https://github.com/settings/tokens/new"
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✓ ERFOLGREICH!"
    echo "========================================="
    echo ""
    echo "Dein Code ist jetzt auf GitHub!"
    echo ""
    echo "NÄCHSTER SCHRITT: Vercel Deployment"
    echo "1. Gehe zu: https://vercel.com/login"
    echo "2. Melde dich mit GitHub an"
    echo "3. Klicke 'Add New Project'"
    echo "4. Wähle dein 'jetzz-app' Repository"
    echo "5. Setze Root Directory auf: web"
    echo "6. Klicke 'Deploy'"
    echo ""
    echo "Siehe GITHUB-PUSH-ANLEITUNG.md für Details!"
else
    echo ""
    echo "========================================="
    echo "✗ FEHLER beim Push"
    echo "========================================="
    echo ""
    echo "Mögliche Lösungen:"
    echo "1. Stelle sicher, dass du ein Personal Access Token verwendest"
    echo "2. Prüfe die Repository URL"
    echo "3. Versuche es manuell mit:"
    echo "   git push -u origin main"
fi
