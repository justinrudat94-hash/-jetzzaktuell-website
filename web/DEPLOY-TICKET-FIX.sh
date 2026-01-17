#!/bin/bash

# Deploy Ticket Page Fix to Vercel
echo "🚀 Deploying Ticket Page Fix..."

cd "$(dirname "$0")"

# Check if git is initialized
if [ ! -d ".git" ]; then
  echo "Initializing git repository..."
  git init
  git remote add origin https://github.com/justin-rud/jetzz-website.git
fi

# Configure git
git config user.email "justin@jetzz.app"
git config user.name "Justin"

# Add and commit changes
echo "📝 Committing changes..."
git add app/ticket/[token]/page.tsx next.config.js
git commit -m "Fix: Enable dynamic rendering for ticket pages

- Added 'force-dynamic' export to ticket page
- Set revalidate to 0 for real-time updates
- Changed Next.js output to 'standalone' mode
- This fixes the issue where ticket pages show only token without content"

# Push to main branch
echo "⬆️  Pushing to GitHub..."
git branch -M main
git push -u origin main --force

echo "✅ Done! Vercel will automatically redeploy."
echo "⏱️  Check status at: https://vercel.com/justin-rudals-projects/web/deployments"
