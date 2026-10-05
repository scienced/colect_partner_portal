import { prisma } from "@/lib/prisma"
import {
  assetPortalUrl,
  DOWNLOAD_URL_VALID_FOR_MS,
  type AssetDownloadInfo,
} from "@/lib/portalUrls"
import { getPresignedUrls } from "@/lib/s3"
import type { Viewer } from "@/lib/access"

/**
 * Postgres full-text search across the portal's content tables.
 *
 * Snippets use `ts_headline` so matched terms are highlighted (with `**…**`
 * markers — markdown-friendly so an agent can render them as bold or strip
 * them trivially).
 *
 * Phase 1 (this file): per-table `to_tsvector` queries computed at query time,
 * no schema changes required. Plenty fast for the current content volume.
 *
 * Phase 2 (when needed): replace the inline tsvector with a generated, GIN-
 * indexed column per table. `searchAssets`/`searchDocs`/etc. callers don't
 * change — only the SQL inside.
 *
 * Phase 3 (when judged worth it): add `pgvector` embeddings + a hybrid
 * BM25/cosine scorer. Same interface.
 */

export type SearchResultType =
  | "asset"
  | "docs_update"
  | "product_update"
  | "team_member"
  | "featured"

export interface SearchResult {
  type: SearchResultType
  id: string
  title: string
  /** Body excerpt with matched terms wrapped in `**…**` (markdown bold). */
  snippet: string | null
  /**
   * The URL that's most useful to *follow* for this result. For docs_update
   * this is the direct GitBook URL; for asset it's a portal deep-link that
   * opens the asset drawer. For the actual downloadable file of an asset,
   * use the `download` field.
   */
  url: string
  updatedAt: string
  rank: number
  meta?: Record<string, unknown>
  /**
   * Asset results only. Present (non-null) when the asset has a downloadable
   * variant — gives the agent the direct PDF/file URL inline so it doesn't
   * need a second `portal_get_asset` round-trip just to consume the content.
   */
  download?: AssetDownloadInfo | null
}

export interface SearchOpts {
  query: string
  types?: SearchResultType[]
  limitPerType?: number
  origin: string
  /** Whose search this is — decides whether employee-only assets match. */
  viewer: Viewer
}

const DEFAULT_LIMIT_PER_TYPE = 5

// ts_headline options: short single-fragment snippets with markdown markers.
const HEADLINE_OPTS =
  "StartSel=**, StopSel=**, MaxFragments=1, MaxWords=30, MinWords=10"

export async function searchPortal(opts: SearchOpts): Promise<SearchResult[]> {
  const q = opts.query.trim()
  if (q.length < 2) return []
  const types = new Set<SearchResultType>(
    opts.types ?? ["asset", "docs_update", "product_update", "team_member", "featured"]
  )
  const limit = opts.limitPerType ?? DEFAULT_LIMIT_PER_TYPE
  const origin = opts.origin
  const viewer = opts.viewer

  const tasks: Promise<SearchResult[]>[] = []
  if (types.has("asset")) tasks.push(searchAssets(q, limit, origin, viewer))
  if (types.has("docs_update")) tasks.push(searchDocs(q, limit, origin))
  if (types.has("product_update")) tasks.push(searchProductUpdates(q, limit, origin))
  if (types.has("team_member")) tasks.push(searchTeam(q, limit, origin))
  if (types.has("featured")) tasks.push(searchFeatured(q, limit, origin, viewer))

  const batches = await Promise.all(tasks)
  const all = batches.flat()
  all.sort((a, b) => b.rank - a.rank)
  return all
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-table FTS queries. Each weights title > body so a title hit always
// outranks a body hit. `plainto_tsquery` keeps things forgiving for casual
// queries (no operator syntax required). `ts_headline` returns a focused
// fragment around the match.
// ─────────────────────────────────────────────────────────────────────────────

async function searchAssets(q: string, limit: number, origin: string, viewer: Viewer): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string; title: string; description: string | null; type: string; updatedAt: Date;
      rank: number; headline: string | null; visibility: string; brand: string | null
    }[]
  >`
    SELECT id, title, description, "type"::text AS type, "updatedAt",
      "visibility"::text AS visibility, "brand"::text AS brand,
      ts_rank_cd(
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(description,'')), 'B'),
        plainto_tsquery('english', ${q})
      ) AS rank,
      ts_headline('english', coalesce(description, title), plainto_tsquery('english', ${q}), ${HEADLINE_OPTS}) AS headline
    FROM "Asset"
    WHERE "publishedAt" IS NOT NULL
      AND (${viewer.isEmployee} OR "visibility" = 'EVERYONE')
      AND (
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(description,'')), 'B')
      ) @@ plainto_tsquery('english', ${q})
    ORDER BY rank DESC
    LIMIT ${limit}
  `
  if (rows.length === 0) return []

  // Attach the default-variant download URL inline so an agent gets the
  // consumable file in the same response — no second portal_get_asset call
  // just to find out where the PDF lives.
  const downloads = await resolveDefaultVariantDownloads(rows.map((r) => r.id))

  return rows.map((r) => ({
    type: "asset" as const,
    id: r.id,
    title: r.title,
    snippet: r.headline,
    // Deep-link directly to the asset drawer on the matching category page.
    url: assetPortalUrl(origin, r.type, r.id),
    updatedAt: r.updatedAt.toISOString(),
    rank: Number(r.rank),
    meta: {
      assetType: r.type,
      // Internal tagging — employees only (same rule as access.internalAssetFields).
      ...(viewer.isEmployee ? { visibility: r.visibility, brand: r.brand } : {}),
    },
    download: downloads.get(r.id) ?? null,
  }))
}

/**
 * For each asset id, look up its default (first by displayOrder) variant and
 * return a presigned-or-external download block. Used by both /api/v1/search
 * and /api/v1/assets so they expose consumable URLs inline.
 */
export async function resolveDefaultVariantDownloads(
  assetIds: string[]
): Promise<Map<string, AssetDownloadInfo>> {
  if (assetIds.length === 0) return new Map()

  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: {
      id: true,
      variants: {
        orderBy: [{ displayOrder: "asc" }, { language: "asc" }],
        take: 1,
        select: { language: true, fileUrl: true, fileType: true, fileSize: true, externalLink: true },
      },
    },
  })

  // Batch-presign — getPresignedUrls is cached, so a search across pages of
  // the same content doesn't re-sign every time.
  const fileUrls = assets.map((a) => a.variants[0]?.fileUrl ?? null)
  const presigned = await getPresignedUrls(fileUrls)
  const expiresAt = new Date(Date.now() + DOWNLOAD_URL_VALID_FOR_MS).toISOString()

  const out = new Map<string, AssetDownloadInfo>()
  assets.forEach((a, i) => {
    const v = a.variants[0]
    if (!v) return
    out.set(a.id, {
      url: presigned[i],
      externalLink: v.externalLink,
      expiresAt: presigned[i] ? expiresAt : null,
      fileType: v.fileType,
      fileSize: v.fileSize,
      language: v.language,
    })
  })
  return out
}

async function searchDocs(q: string, limit: number, origin: string): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<
    { id: string; title: string; summary: string; deepLink: string; updatedAt: Date; rank: number; headline: string | null }[]
  >`
    SELECT id, title, summary, "deepLink", "updatedAt",
      ts_rank_cd(
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(summary,'')), 'B'),
        plainto_tsquery('english', ${q})
      ) AS rank,
      ts_headline('english', coalesce(summary, title), plainto_tsquery('english', ${q}), ${HEADLINE_OPTS}) AS headline
    FROM "DocsUpdate"
    WHERE "publishedAt" IS NOT NULL
      AND (
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(summary,'')), 'B')
      ) @@ plainto_tsquery('english', ${q})
    ORDER BY rank DESC
    LIMIT ${limit}
  `
  return rows.map((r) => ({
    type: "docs_update" as const,
    id: r.id,
    title: r.title,
    snippet: r.headline,
    // Docs deepLink is the external (GitBook) page — most useful for agents.
    url: r.deepLink || `${origin}/docs-updates`,
    updatedAt: r.updatedAt.toISOString(),
    rank: Number(r.rank),
  }))
}

async function searchProductUpdates(q: string, limit: number, origin: string): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string; title: string; content: string; updateType: string;
      releaseDate: Date | null; updatedAt: Date; rank: number; headline: string | null
    }[]
  >`
    SELECT id, title, content, "updateType", "releaseDate", "updatedAt",
      ts_rank_cd(
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(content,'')), 'B'),
        plainto_tsquery('english', ${q})
      ) AS rank,
      ts_headline('english', coalesce(content, title), plainto_tsquery('english', ${q}), ${HEADLINE_OPTS}) AS headline
    FROM "ProductUpdate"
    WHERE "publishedAt" IS NOT NULL
      AND (
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(content,'')), 'B')
      ) @@ plainto_tsquery('english', ${q})
    ORDER BY rank DESC
    LIMIT ${limit}
  `
  return rows.map((r) => ({
    type: "product_update" as const,
    id: r.id,
    title: r.title,
    snippet: r.headline,
    url: `${origin}/product`,
    updatedAt: r.updatedAt.toISOString(),
    rank: Number(r.rank),
    meta: { updateType: r.updateType, releaseDate: r.releaseDate?.toISOString() ?? null },
  }))
}

async function searchTeam(q: string, limit: number, origin: string): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string; name: string; role: string; department: string;
      bio: string | null; updatedAt: Date; rank: number; headline: string | null
    }[]
  >`
    SELECT id, name, role, department, bio, "updatedAt",
      ts_rank_cd(
        setweight(to_tsvector('english', coalesce(name,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(role,'')), 'B') ||
        setweight(to_tsvector('english', coalesce(department,'')), 'B') ||
        setweight(to_tsvector('english', coalesce(bio,'')), 'C'),
        plainto_tsquery('english', ${q})
      ) AS rank,
      ts_headline('english', coalesce(bio, role || ' · ' || department), plainto_tsquery('english', ${q}), ${HEADLINE_OPTS}) AS headline
    FROM "TeamMember"
    WHERE (
        setweight(to_tsvector('english', coalesce(name,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(role,'')), 'B') ||
        setweight(to_tsvector('english', coalesce(department,'')), 'B') ||
        setweight(to_tsvector('english', coalesce(bio,'')), 'C')
      ) @@ plainto_tsquery('english', ${q})
    ORDER BY rank DESC
    LIMIT ${limit}
  `
  return rows.map((r) => ({
    type: "team_member" as const,
    id: r.id,
    title: r.name,
    snippet: r.headline,
    url: `${origin}/who-is-who`,
    updatedAt: r.updatedAt.toISOString(),
    rank: Number(r.rank),
    meta: { role: r.role, department: r.department },
  }))
}

async function searchFeatured(q: string, limit: number, origin: string, viewer: Viewer): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string; title: string; description: string | null;
      entityType: string; updatedAt: Date; rank: number; headline: string | null
    }[]
  >`
    SELECT id, title, description, "entityType", "updatedAt",
      ts_rank_cd(
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(description,'')), 'B'),
        plainto_tsquery('english', ${q})
      ) AS rank,
      ts_headline('english', coalesce(description, title), plainto_tsquery('english', ${q}), ${HEADLINE_OPTS}) AS headline
    FROM "FeaturedContent"
    WHERE ("endDate" IS NULL OR "endDate" > NOW())
      AND "startDate" <= NOW()
      -- Hide featured items that point at an asset this viewer can't see.
      AND (
        "assetId" IS NULL
        OR ${viewer.isEmployee}
        OR EXISTS (
          SELECT 1 FROM "Asset" a
          WHERE a.id = "FeaturedContent"."assetId" AND a."visibility" = 'EVERYONE'
        )
      )
      AND (
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(description,'')), 'B')
      ) @@ plainto_tsquery('english', ${q})
    ORDER BY rank DESC
    LIMIT ${limit}
  `
  return rows.map((r) => ({
    type: "featured" as const,
    id: r.id,
    title: r.title,
    snippet: r.headline,
    url: `${origin}/`,
    updatedAt: r.updatedAt.toISOString(),
    rank: Number(r.rank),
    meta: { entityType: r.entityType },
  }))
}
