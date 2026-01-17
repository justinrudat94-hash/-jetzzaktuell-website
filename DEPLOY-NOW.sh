#!/bin/bash

echo "🚀 Deploying Jetzz App with Ticket System..."
echo ""

# GitHub Repository URL
REPO_URL="https://github.com/justinrudat94-hash/jetzzaktuell-website.git"

# Check if remote exists
if git remote get-url origin 2>/dev/null; then
    echo "✓ Remote 'origin' exists"
    git remote set-url origin $REPO_URL
else
    echo "➕ Adding remote 'origin'..."
    git remote add origin $REPO_URL
fi

echo ""
echo "📤 Pushing to GitHub..."
echo "⚠️  You may be asked for GitHub credentials"
echo ""

git push -u origin main --force

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS!"
    echo ""
    echo "🔄 Vercel will deploy automatically in 2-3 minutes"
    echo "🌐 Then this will work: https://app.jetzzapp.com/ticket/[token]"
    echo ""
    echo "Check deployment: https://vercel.com/justin-rudats-projects/web"
else
    echo ""
    echo "❌ Push failed!"
    echo ""
    echo "💡 Solutions:"
    echo "1. Create GitHub Token: https://github.com/settings/tokens"
    echo "2. Then run:"
    echo "   git push https://YOUR_TOKEN@github.com/justinrudat94-hash/jetzzaktuell-website.git main --force"
fi
