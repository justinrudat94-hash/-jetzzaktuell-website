# Jetzz Marketing Website

Modern Next.js marketing website for the Jetzz event app.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Database**: Supabase
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install
```

### Environment Variables

The `.env` file is already created with Supabase credentials. For Vercel deployment, add these variables in the Vercel Dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vhhfztpijdemocghpwqj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaGZ6dHBpamRlbW9jZ2hwd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTg1MzUsImV4cCI6MjA3NTQ5NDUzNX0.BxIBpS3rXM0qrfpcJQzXSdJ4zxHQOAnbC46p15PcIBM
```

### Development

```bash
# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
web/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Homepage
│   ├── impressum/         # Legal pages
│   ├── datenschutz/
│   ├── agb/
│   └── widerruf/
├── components/            # React components
│   ├── Navigation.tsx
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── Download.tsx
│   └── Footer.tsx
├── lib/                   # Utilities
│   └── supabase.ts       # Supabase client
└── public/               # Static assets
```

## Features

- Responsive design for all screen sizes
- Modern animations with Framer Motion
- SEO optimized
- Legal pages (Impressum, Datenschutz, AGB, Widerruf)
- Supabase integration ready
- Fast build times with Next.js 14

## Deployment

### Vercel (Recommended)

#### Step 1: Prepare GitHub Repository

```bash
# Option A: Create a new separate repository (RECOMMENDED)
# 1. Create a new repository on GitHub: jetzz-website
# 2. Copy only the /web folder contents to the new repository
# 3. Push to GitHub

# Option B: Use existing repository
# Connect Vercel to the main repository and set Root Directory to "web"
```

#### Step 2: Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `web` (if using main repository) or `.` (if separate repo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### Step 3: Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://vhhfztpijdemocghpwqj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaGZ6dHBpamRlbW9jZ2hwd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTg1MzUsImV4cCI6MjA3NTQ5NDUzNX0.BxIBpS3rXM0qrfpcJQzXSdJ4zxHQOAnbC46p15PcIBM
```

#### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Your site will be live at: `jetzz-website.vercel.app`

#### Step 5: Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain: `jetzz.app` or `www.jetzz.app`
3. Follow Vercel's DNS configuration instructions
4. SSL certificate is automatically configured

### Automatic Deployments

Once connected, Vercel will automatically:
- Deploy every push to the main branch
- Create preview deployments for pull requests
- Provide deployment URLs for each deployment

### Other Platforms

The website can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Digital Ocean App Platform
- Self-hosted with Node.js

## Customization

### Colors

Edit `tailwind.config.ts` to change the color scheme.

### Content

- Homepage: Edit `app/page.tsx`
- Components: Edit files in `components/`
- Legal pages: Edit files in `app/impressum/`, etc.

### Images

Replace placeholder images with your own in the components.

## License

Private - All rights reserved
