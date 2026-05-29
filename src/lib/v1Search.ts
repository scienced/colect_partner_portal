import { prisma } from "@/lib/prisma"

/**
 * Postgres full-text search across the portal's content tables.
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
  snippet: string | null
  url: string
  updatedAt: string
  rank: number
  meta?: Record<string, unknown>
}

export interface SearchOpts {
  query: string
  types?: SearchResultType[]
  limitPerType?: number
  origin: string
}

const DEFAULT_LIMIT_PER_TYPE = 5
const SNIPPET_MAX = 200

function snippet(text: string | null | undefined): string | null {
  if (!text) return null
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length > SNIPPET_MAX ? clean.slice(0, SNIPPET_MAX - 1) + "…" : clean
}

function assetUrl(origin: string, _id: string, type: string): string {
  // The portal renders assets inside category-list pages, not detail pages, so
  // the canonical URL is the category page. (Detail UI is a drawer on top of
  // it.) Detail fetches are available via /api/v1/assets/:id.
  const map: Record<string, string> = {
    DECK: "/decks",
    CAMPAIGN: "/campaigns",
    VIDEO: "/videos",
    ASSET: "/assets",
  }
  return `${origin}${map[type] ?? "/assets"}`
}

export async function searchPortal(opts: SearchOpts): Promise<SearchResult[]> {
  const q = opts.query.trim()
  if (q.length < 2) return []
  const types = new Set<SearchResultType>(
    opts.types ?? ["asset", "docs_update", "product_update", "team_member", "featured"]
  )
  const limit = opts.limitPerType ?? DEFAULT_LIMIT_PER_TYPE
  const origin = opts.origin

  const tasks: Promise<SearchResult[]>[] = []
  if (types.has("asset")) tasks.push(searchAssets(q, limit, origin))
  if (types.has("docs_update")) tasks.push(searchDocs(q, limit, origin))
  if (types.has("product_update")) tasks.push(searchProductUpdates(q, limit, origin))
  if (types.has("team_member")) tasks.push(searchTeam(q, limit, origin))
  if (types.has("featured")) tasks.push(searchFeatured(q, limit, origin))

  const batches = await Promise.all(tasks)
  const all = batches.flat()
  all.sort((a, b) => b.rank - a.rank)
  return all
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-table FTS queries. Each weights title > body so a title hit always
// outranks a body hit. `plainto_tsquery` keeps things forgiving for casual
// queries (no operator syntax required).
// ─────────────────────────────────────────────────────────────────────────────

async function searchAssets(q: string, limit: number, origin: string): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<
    { id: string; title: string; description: string | null; type: string; updatedAt: Date; rank: number }[]
  >`
    SELECT id, title, description, "type"::text AS type, "updatedAt",
      ts_rank_cd(
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(description,'')), 'B'),
        plainto_tsquery('english', ${q})
      ) AS rank
    FROM "Asset"
    WHERE "publishedAt" IS NOT NULL
      AND (
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(description,'')), 'B')
      ) @@ plainto_tsquery('english', ${q})
    ORDER BY rank DESC
    LIMIT ${limit}
  `
  return rows.map((r) => ({
    type: "asset" as const,
    id: r.id,
    title: r.title,
    snippet: snippet(r.description),
    url: assetUrl(origin, r.id, r.type),
    updatedAt: r.updatedAt.toISOString(),
    rank: Number(r.rank),
    meta: { assetType: r.type },
  }))
}

async function searchDocs(q: string, limit: number, origin: string): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<
    { id: string; title: string; summary: string; deepLink: string; updatedAt: Date; rank: number }[]
  >`
    SELECT id, title, summary, "deepLink", "updatedAt",
      ts_rank_cd(
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(summary,'')), 'B'),
        plainto_tsquery('english', ${q})
      ) AS rank
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
    snippet: snippet(r.summary),
    // Docs deepLink is external (GitBook); fall back to the portal page.
    url: r.deepLink || `${origin}/docs-updates`,
    updatedAt: r.updatedAt.toISOString(),
    rank: Number(r.rank),
  }))
}

async function searchProductUpdates(q: string, limit: number, origin: string): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string; title: string; content: string; updateType: string;
      releaseDate: Date | null; updatedAt: Date; rank: number
    }[]
  >`
    SELECT id, title, content, "updateType", "releaseDate", "updatedAt",
      ts_rank_cd(
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(content,'')), 'B'),
        plainto_tsquery('english', ${q})
      ) AS rank
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
    snippet: snippet(r.content),
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
      bio: string | null; updatedAt: Date; rank: number
    }[]
  >`
    SELECT id, name, role, department, bio, "updatedAt",
      ts_rank_cd(
        setweight(to_tsvector('english', coalesce(name,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(role,'')), 'B') ||
        setweight(to_tsvector('english', coalesce(department,'')), 'B') ||
        setweight(to_tsvector('english', coalesce(bio,'')), 'C'),
        plainto_tsquery('english', ${q})
      ) AS rank
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
    snippet: snippet(`${r.role} · ${r.department}${r.bio ? " — " + r.bio : ""}`),
    url: `${origin}/who-is-who`,
    updatedAt: r.updatedAt.toISOString(),
    rank: Number(r.rank),
    meta: { role: r.role, department: r.department },
  }))
}

async function searchFeatured(q: string, limit: number, origin: string): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string; title: string; description: string | null;
      entityType: string; updatedAt: Date; rank: number
    }[]
  >`
    SELECT id, title, description, "entityType", "updatedAt",
      ts_rank_cd(
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(description,'')), 'B'),
        plainto_tsquery('english', ${q})
      ) AS rank
    FROM "FeaturedContent"
    WHERE ("endDate" IS NULL OR "endDate" > NOW())
      AND "startDate" <= NOW()
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
    snippet: snippet(r.description),
    url: `${origin}/`,
    updatedAt: r.updatedAt.toISOString(),
    rank: Number(r.rank),
    meta: { entityType: r.entityType },
  }))
}
