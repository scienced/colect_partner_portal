# Colect Partner Portal

A web application for Colect partners to access sales materials, campaigns, videos, and documentation.

## Features

- **Sales Decks** - Download and preview sales presentations
- **Campaigns** - Access email campaign templates and materials
- **Videos** - Watch product demos and training videos
- **Assets & Links** - Browse additional resources and external links
- **Documentation** - Stay updated with the latest docs
- **Who's Who** - Team directory

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: SuperTokens (passwordless email)
- **File Storage**: AWS S3
- **Styling**: Tailwind CSS

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run development server
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

- `DATABASE_URL` - PostgreSQL connection string
- `SUPERTOKENS_*` - Authentication credentials
- `AWS_*` / `S3_BUCKET_NAME` - S3 file storage
- `POSTMARK_API_KEY` - Email sending

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:studio` | Open Prisma Studio |
