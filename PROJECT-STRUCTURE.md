# Jetzz Project Structure

This repository contains two separate applications that share the same Supabase database.

## Project Overview

```
jetzz-app/
├── app/                    # Expo Mobile App (React Native)
├── components/             # Mobile App Components
├── services/              # Mobile App Services
├── supabase/              # Shared Supabase (Database, Edge Functions)
└── web/                   # Next.js Marketing Website (NEW)
```

## Applications

### 1. Mobile App (Expo/React Native)

**Location**: Root directory (app/, components/, etc.)

**Purpose**: Main event discovery and management app for iOS and Android

**Tech Stack**:
- Expo SDK 52
- React Native
- TypeScript
- Supabase (Database & Auth)

**Run**:
```bash
npm run dev
```

**Build**:
```bash
npm run build
```

### 2. Marketing Website (Next.js)

**Location**: `/web` directory

**Purpose**: Public marketing website with landing page and legal pages

**Tech Stack**:
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase (Optional)

**Run**:
```bash
cd web
npm run dev
```

**Build**:
```bash
cd web
npm run build
```

## Shared Resources

### Supabase Database

Both applications connect to the same Supabase instance:

- **URL**: https://vhhfztpijdemocghpwqj.supabase.co
- **Mobile App**: Uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Website**: Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Environment Variables

**Mobile App** (`.env` in root):
```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

**Website** (`web/.env`):
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Development Workflow

### Working on Mobile App

```bash
# Install dependencies (if not already done)
npm install

# Start Expo development server
npm run dev
```

### Working on Website

```bash
# Navigate to web directory
cd web

# Install dependencies (if not already done)
npm install

# Start Next.js development server
npm run dev
```

### Working on Supabase

All Supabase resources (migrations, edge functions) are in the shared `/supabase` directory:

```
supabase/
├── migrations/         # Database migrations (used by both apps)
└── functions/          # Edge Functions (used by both apps)
```

## Deployment

### Mobile App

Deploy to:
- **iOS**: App Store (via EAS Build)
- **Android**: Google Play Store (via EAS Build)

```bash
eas build --platform ios
eas build --platform android
```

### Marketing Website

Deploy to:
- **Vercel** (Recommended)
- **Netlify**
- **AWS Amplify**
- **Self-hosted**

For Vercel:
```bash
cd web
vercel
```

### Supabase

Already deployed and running at: https://vhhfztpijdemocghpwqj.supabase.co

## Important Notes

1. **Keep them separate**: The mobile app and website are completely independent applications
2. **Shared database**: Both use the same Supabase instance
3. **Independent deployments**: Deploy each application separately
4. **No dependencies**: Website doesn't depend on mobile app and vice versa
5. **Environment variables**: Each app has its own .env file

## Getting Started

### First Time Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd jetzz-app
```

2. **Setup Mobile App**
```bash
npm install
# Create .env file with Supabase credentials
npm run dev
```

3. **Setup Website**
```bash
cd web
npm install
# Create .env file with Supabase credentials
npm run dev
```

## Questions?

- Mobile App issues: Check root directory README.md
- Website issues: Check web/README.md
- Database issues: Check supabase/migrations/
