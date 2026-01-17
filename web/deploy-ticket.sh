#!/bin/bash

# Ensure we're in the web directory
cd "$(dirname "$0")"

echo "Building production version..."
npm run build

echo ""
echo "Deploying to Vercel..."
echo "Please make sure you're logged in with 'vercel login'"
echo ""

vercel --prod

echo ""
echo "Deployment complete! The ticket route should now be available."
