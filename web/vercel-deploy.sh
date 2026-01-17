#!/bin/bash

# Vercel Deployment Script
# Token ist bereits gesetzt

cd web

echo "Installing Vercel CLI..."
npm install -g vercel

echo "Deploying to Vercel..."
vercel --token vercel_NzQJvjLB9iREEEDk3e9Y5C2A --prod

echo "Deployment complete!"
