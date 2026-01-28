# Partner Portal

A self-hosted web application for partners to access sales materials, campaigns, videos, and documentation. Built with Next.js, PostgreSQL, and modern authentication.

## Features

- **Sales Decks** - Upload and share sales presentations (PDF preview supported)
- **Campaigns** - Share email campaign templates and marketing materials
- **Videos** - Embed YouTube videos for product demos and training
- **Assets & Links** - Organize additional resources and external links
- **Documentation** - Post documentation updates with external links
- **Who's Who** - Team directory with contact information
- **Admin Dashboard** - Manage all content, users, and featured items
- **Analytics** - Track page views, asset downloads, and search queries

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: SuperTokens (passwordless email login)
- **File Storage**: AWS S3
- **Styling**: Tailwind CSS

---

## Quick Start Guide

### Prerequisites

- Node.js 18+ installed
- A PostgreSQL database (see below)
- An AWS S3 bucket for file storage
- A SuperTokens account (free tier available)

### Step 1: Database Setup

We recommend [Neon](https://neon.tech) for a quick, free PostgreSQL database:

1. Create a free account at https://neon.tech
2. Create a new project
3. Copy your connection string (it looks like `postgresql://user:pass@host/dbname?sslmode=require`)

Alternatively, you can use any PostgreSQL database (local, Railway, Supabase, etc.).

### Step 2: SuperTokens Setup

1. Create a free account at https://supertokens.com
2. Create a new app and select "Passwordless" recipe
3. Copy your Connection URI and API Key from the dashboard

### Step 3: AWS S3 Setup

1. Create an S3 bucket in your AWS account
2. Create an IAM user with S3 permissions (see policy below)
3. Generate access keys for the IAM user
4. Configure CORS on your bucket (see below)

#### IAM Policy for S3

Create an IAM user with this policy (replace `your-bucket-name`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

#### S3 CORS Configuration

In your S3 bucket settings, go to Permissions → CORS and add this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-domain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Replace `https://your-domain.com` with your actual deployment URL.

### Step 4: Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration (see [Environment Variables](#environment-variables) section below).

### Step 5: Install and Run

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# (Optional) Seed with sample data
npm run db:seed

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# SuperTokens Authentication
SUPERTOKENS_CONNECTION_URI="https://your-app.supertokens.io"
SUPERTOKENS_API_KEY="your-api-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AWS S3 Storage
AWS_REGION="eu-west-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="your-bucket-name"
```

### Branding Variables (Optional)

Customize your portal's appearance without modifying code:

```env
# Company branding
NEXT_PUBLIC_SITE_NAME="Your Company"
NEXT_PUBLIC_SITE_TITLE="Partner Portal"
NEXT_PUBLIC_SITE_TAGLINE="Partner-only workspace for resellers"
NEXT_PUBLIC_SUPPORT_EMAIL="support@yourcompany.com"

# Primary brand color (hex format)
NEXT_PUBLIC_PRIMARY_COLOR="#ef556d"

# Logo (external URL or path in /public folder)
NEXT_PUBLIC_LOGO_URL="https://your-bucket.s3.amazonaws.com/logo.png"
NEXT_PUBLIC_LOGO_WIDTH="120"
NEXT_PUBLIC_LOGO_HEIGHT="40"
```

### Optional Variables

```env
# Email (Postmark) - for digest emails
POSTMARK_API_KEY="your-postmark-key"
EMAIL_FROM="portal@yourcompany.com"

# Cron Secret - for scheduled tasks
CRON_SECRET="your-random-secret"

# Screenshot API - for auto-generating campaign thumbnails (https://screenshotbase.com)
# Only needed if you upload HTML campaign files and want auto-generated thumbnails
SCREENSHOTBASE_KEY="your-screenshotbase-key"

# Documentation URL - shown in admin placeholders
NEXT_PUBLIC_DOCS_URL="https://docs.yourcompany.com"
```

---

## Customization

### Branding (Recommended: Environment Variables)

The easiest way to customize branding is through environment variables. This allows you to:
- Use the same codebase for multiple deployments
- Keep your branding out of source control
- Change branding without rebuilding

Set these variables in your deployment platform:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_SITE_NAME` | Company name | "Your Company" |
| `NEXT_PUBLIC_SITE_TITLE` | Portal title | "Partner Portal" |
| `NEXT_PUBLIC_SITE_TAGLINE` | Tagline on login page | "Partner-only workspace..." |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Support email | "support@yourcompany.com" |
| `NEXT_PUBLIC_PRIMARY_COLOR` | Brand color (hex) | "#ef556d" |
| `NEXT_PUBLIC_LOGO_URL` | Logo URL | null (shows text) |
| `NEXT_PUBLIC_LOGO_WIDTH` | Logo width (px) | 120 |
| `NEXT_PUBLIC_LOGO_HEIGHT` | Logo height (px) | 40 |

### Logo Setup

You have two options for the logo:

1. **External URL (Recommended)**: Host your logo anywhere (S3, Cloudinary, Imgur, your own CDN) and set `NEXT_PUBLIC_LOGO_URL` to the full URL. Any image host works - no configuration needed.

2. **Local file**: Place your logo in the `/public` folder and set `NEXT_PUBLIC_LOGO_URL` to the path (e.g., `/logo.png`).

If no logo URL is set, the portal displays your company name as text.

**Supported formats**: PNG, JPG, SVG, WebP

### Primary Color

Set `NEXT_PUBLIC_PRIMARY_COLOR` to any hex color (e.g., `#3B82F6` for blue). This single setting controls all primary-colored elements including buttons, links, and accents.

---

## Admin Access

After setting up, grant admin access to your first user:

1. Log in with your email (you'll be a regular "partner" by default)
2. Open Prisma Studio: `npm run db:studio`
3. Find your user in the `User` table
4. Change the `role` field from `PARTNER` to `ADMIN`
5. Refresh your browser

Admin users can access `/admin` to manage all content.

---

## Partner Access Control

Partners can only log in if their email domain is in the allowed list:

1. Go to Admin → Partners
2. Add allowed email domains (e.g., `partnercorp.com`)
3. Anyone with an email from that domain can now log in

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio (database UI) |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:migrate` | Create and run migrations |

---

## Deployment

### DigitalOcean App Platform (Recommended)

1. Push your code to GitHub

2. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps) and click "Create App"

3. Connect your GitHub repository

4. Configure the app:
   - **Type**: Web Service
   - **Build Command**: `npm run build`
   - **Run Command**: `npm run start`

5. Add environment variables in the "Environment Variables" section:
   - All required variables (DATABASE_URL, SUPERTOKENS_*, AWS_*, S3_BUCKET_NAME)
   - Branding variables (NEXT_PUBLIC_SITE_NAME, NEXT_PUBLIC_PRIMARY_COLOR, etc.)

6. Deploy

**Tip**: Use DigitalOcean Managed Databases for PostgreSQL, or connect to an external database like Neon.

### Docker

A `Dockerfile` is included. Build and run:

```bash
docker build -t partner-portal .
docker run -p 3000:3000 --env-file .env.local partner-portal
```

### Vercel

1. Import the project from GitHub
2. Add all environment variables
3. Deploy

---

## Notes

- **Email Digest**: The weekly email digest feature is partially implemented. The templates exist but scheduled sending requires cron setup.
- **Thumbnail Generation**: Auto-thumbnail generation for HTML campaign files uses [Screenshotbase](https://screenshotbase.com) (optional). Manual thumbnail upload works without this.

---

## License

MIT
