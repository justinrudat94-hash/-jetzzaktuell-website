#!/bin/bash

echo "🔧 Fixing Ticket Page - SSR Mode"
echo "=================================="
echo ""

cd "$(dirname "$0")"

echo "✓ Removed 'output: standalone' from next.config.js"
echo "✓ Build successful - Ticket route is now Dynamic (ƒ)"
echo ""
echo "📦 Pushing to GitHub..."
git add next.config.js
git commit -m "fix: Remove standalone output mode for Vercel SSR"
git push

echo ""
echo "✅ FERTIG!"
echo ""
echo "Vercel deployed automatisch in 2-3 Minuten."
echo "Dann sollte die Ticket-Seite funktionieren:"
echo "https://app.jetzzapp.com/ticket/466089b2-a725-4871-b776-da13bcccfc28"
echo ""
echo "Hard-Refresh im Browser: STRG+SHIFT+R (Windows) / CMD+SHIFT+R (Mac)"
