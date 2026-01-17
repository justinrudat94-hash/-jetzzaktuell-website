#!/bin/bash
# Quick Push - Minimales Script für schnelle Commits

TOKEN=$(cat .github-token 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Token nicht gefunden!"
  exit 1
fi

# Git konfigurieren
git config user.email "bot@jetzz.app"
git config user.name "Jetzz Bot"

# Commit & Push
git add -A
git commit -m "${1:-Quick update}"
git push https://${TOKEN}@github.com/justinrudat94-hash/-jetzzaktuell-website.git main --force

echo "✅ Erfolgreich gepusht!"
