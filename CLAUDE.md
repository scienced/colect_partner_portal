# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build (runs prisma generate first)
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

No test framework is configured in this project.

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 14 with App Router, `standalone` output mode
- **Language**: TypeScript (strict mode, `@/*` path alias for `./src/*`)
- **Database**: PostgreSQL with Prisma ORM (connection pool: 10 connections, 20s timeout)
- **Authentication**: SuperTokens (passwordless magic link, email-based)
- **Styling**: Tailwind CSS with CSS variable-based primary color
- **Data Fetching**: SWR for client-side, direct Prisma queries for Server Components
- **File Storage**: AWS S3 with presigned URLs (in-memory cache, 45min TTL)
- **Email**: Postmark API

### Application Structure

Two main areas:
- **Partner Portal** (`src/app/(portal)/`): Protected routes — decks, campaigns, videos, docs updates, product updates, who-is-who
- **Admin Dashboard** (`src/app/admin/`): Asset management, analytics, partners, featured content, docs/product updates

### Key Patterns

**Authentication & Authorization**:
- Middleware (`src/middleware.ts`) validates sessions and redirects unauthenticated users
- Public routes: `/login`, `/login/verify`, `/api/auth/*`
- Domain-based access control: only emails from domains in `AllowedDomain` table can sign up
- Session helpers in `src/lib/supertokens/session.ts`:
  - `requireSession()` — throws if not authenticated (use in API routes)
  - `requireAdmin()` — throws if not admin role (use in admin API routes)
  - `isAuthenticated()` / `isAdmin()` — boolean checks (use in layouts/pages)

**API Routes**:
- Portal routes (`/api/portal/*`): require `requireSession()`, no-cache headers
- Admin routes (`/api/admin/*`): require `requireAdmin()`
- Zod schemas for request validation; return 400 for validation errors, 409 for unique constraint violations (Prisma P2002)

**Data Fetching**:
- Typed SWR hooks in `src/lib/swr.ts` (useAssets, useDecks, etc.)
- Custom fetcher handles 401 errors with automatic session refresh retry
- SWR configured with 60s deduping, no auto-refetch on focus

**S3 File Operations** (`src/lib/s3.ts`):
- `getPresignedUploadUrl()` / `getPresignedDownloadUrl()` for client-side uploads/downloads
- `getPresignedUrls()` for batch presigning (use this instead of individual calls for performance)
- `uploadThumbnail()` / `uploadBuffer()` for server-side uploads
- Presigned URL cache with 45-minute TTL and auto-cleanup

**Database Schema** (`prisma/schema.prisma`):
- `Asset`: Unified table for decks, campaigns, videos, and general assets. Supports region/language/persona metadata arrays
- `User`: Synced with SuperTokens, has PARTNER/ADMIN roles
- `DocsUpdate`, `ProductUpdate`: Content models with pinning support (expiring pins via `pinExpiresAt`)
- `FeaturedContent`: Homepage carousel items with validity periods and display ordering
- `AnalyticsEvent`: Tracks PAGE_VIEW, ASSET_CLICK, ASSET_DOWNLOAD, SEARCH_QUERY
- `Changelog`: Audit trail of entity changes (created/updated/deleted)
- `AllowedDomain`: Partner company domain whitelist for login access control

### Key Library Files

- `src/lib/prisma.ts` — Singleton Prisma client with connection pooling
- `src/lib/s3.ts` — All S3 operations and presigned URL management
- `src/lib/swr.ts` — Typed SWR hooks for all data fetching
- `src/lib/analytics.ts` — Event tracking (`trackPageView`, `trackAssetClick`, etc.) and reporting queries
- `src/lib/email.ts` — Digest email sending via Postmark
- `src/lib/changelog.ts` — Audit trail helpers (`createChangelog`, `getRecentChanges`)
- `src/lib/utils.ts` — `cn()` function for Tailwind class merging
- `src/types/index.ts` — All shared TypeScript types (Asset, DocsUpdate, FeaturedItem, etc.)
- `src/config/site.ts` — Branding configuration (see below)

### Branding & Configuration

The portal is white-label-ready via `src/config/site.ts`. All branding is configurable through `NEXT_PUBLIC_*` environment variables:
- `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_TITLE`, `NEXT_PUBLIC_SITE_TAGLINE`
- `NEXT_PUBLIC_PRIMARY_COLOR` — hex color, injected as CSS variable for Tailwind's `bg-primary`/`text-primary`
- `NEXT_PUBLIC_LOGO_URL`, `NEXT_PUBLIC_LOGO_WIDTH`, `NEXT_PUBLIC_LOGO_HEIGHT`
- `NEXT_PUBLIC_SUPPORT_EMAIL`

### Styling Conventions

- Primary color: `bg-primary`, `text-primary` (configured via CSS variable from `siteConfig.primaryColor`)
- Text hierarchy: `text-gray-900` (headings) → `text-gray-700` (body) → `text-gray-500` (tertiary)
- Icons: Lucide React, sizes `w-4 h-4` (small) to `w-8 h-8` (xlarge)
- Spacing: 8px-based Tailwind scale (`p-4`, `gap-2`, `mb-6`)

### Component Organization

- `src/components/ui/` — Reusable UI components (Button, Card, Modal, Input)
- `src/components/portal/` — Portal-specific components (Sidebar, AssetDrawer, homepage sections)
- `src/components/admin/` — Admin dashboard components
- `src/components/layout/` — Layout wrappers
- `src/components/providers/` — Context providers

## Environment Variables

See `.env.example` for all variables. Required:
- `DATABASE_URL` — PostgreSQL connection string
- `SUPERTOKENS_CONNECTION_URI`, `SUPERTOKENS_API_KEY` — Auth service
- `NEXT_PUBLIC_APP_URL` — App URL (e.g., `http://localhost:3000`)
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` — S3 storage

Optional:
- `NEXT_PUBLIC_SITE_*`, `NEXT_PUBLIC_LOGO_*`, `NEXT_PUBLIC_PRIMARY_COLOR` — Branding
- `POSTMARK_API_KEY`, `EMAIL_FROM` — Email sending
- `CRON_SECRET` — Authentication for cron endpoints
- `SCREENSHOTBASE_KEY` — Auto-generate campaign thumbnails from HTML
