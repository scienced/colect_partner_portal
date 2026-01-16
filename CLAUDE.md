# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint with Next.js core-web-vitals rules
```

## Database Commands (Prisma + PostgreSQL)

```bash
npm run db:generate  # Generate Prisma client after schema changes
npm run db:push      # Push schema to database (no migration history)
npm run db:migrate   # Create and run migrations
npm run db:studio    # Open Prisma Studio UI
npm run db:seed      # Seed database with initial data
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 14 with App Router (file-based routing)
- **Language**: TypeScript (strict mode, `@/*` path alias for `./src/*`)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: SuperTokens (passwordless email-based)
- **Styling**: Tailwind CSS with custom primary color (#ef556d)
- **Data Fetching**: SWR for client-side, direct Prisma queries for Server Components
- **File Storage**: AWS S3 with presigned URLs
- **Email**: Postmark API

### Application Structure

The app has two main areas:
- **Partner Portal** (`src/app/(portal)/`): Protected routes for partners to access decks, videos, product updates
- **Admin Dashboard** (`src/app/admin/`): Asset management, analytics, partner management, content editing

### Key Patterns

**Authentication Flow**:
- Middleware (`src/middleware.ts`) validates session tokens and redirects unauthenticated users
- Public routes: `/login`, `/login/verify`, `/api/auth/*`
- Session management in `src/lib/supertokens/`

**API Routes**:
- Use Zod for request validation
- `requireSession()` middleware for auth checks
- `requireAdmin()` for admin-only endpoints
- Return JSON responses with appropriate status codes

**Data Fetching**:
- Typed SWR hooks in `src/lib/swr.ts` (useAssets, useDecks, etc.)
- Custom fetcher handles 401 errors with automatic session refresh retry
- SWR configured with 60s deduping, no auto-refetch on focus

**Database Schema** (key models in `prisma/schema.prisma`):
- `Asset`: Unified table for decks, campaigns, videos, and general assets
- `User`: Synced with SuperTokens, has PARTNER/ADMIN roles
- `AnalyticsEvent`: Tracks PAGE_VIEW, ASSET_CLICK, ASSET_DOWNLOAD, SEARCH_QUERY
- `AllowedDomains`: Partner company domain whitelist

### Component Organization

- `src/components/ui/`: Reusable UI components (Button, Card, Modal, Input)
- `src/components/portal/`: Portal-specific components (Sidebar, AssetDrawer)
- `src/components/admin/`: Admin-specific components
- `src/lib/utils.ts`: `cn()` function for Tailwind class merging

### Styling Conventions

See `STYLE_GUIDE.md` for comprehensive UI patterns. Key points:
- Primary color: `bg-primary`, `text-primary` (#ef556d coral red)
- Text hierarchy: `text-gray-900` (headings) → `text-gray-700` (body) → `text-gray-500` (tertiary)
- Icons: Lucide React, sizes `w-4 h-4` (small) to `w-8 h-8` (xlarge)
- Spacing: 8px-based Tailwind scale (`p-4`, `gap-2`, `mb-6`)

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection string
- `SUPERTOKENS_*`: Auth service credentials
- `AWS_*`, `S3_BUCKET_NAME`: S3 file storage
- `POSTMARK_API_KEY`, `EMAIL_FROM`: Email sending
- `CRON_SECRET`: Authentication for cron endpoints
