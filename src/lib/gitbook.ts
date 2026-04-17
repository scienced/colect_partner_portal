/**
 * GitBook client for fetching recently-updated pages from Colect's public
 * documentation sites (docs.colect.io/user and docs.colect.io/admin).
 *
 * - Server-only module (never import from client components).
 * - Auth via GITBOOK_API_TOKEN env var (Bearer token, format gb_api_*).
 * - Scoped to GITBOOK_ORG_ID env var (Colect org on GitBook).
 * - Feature-flagged by env-var presence: returns [] silently if misconfigured.
 * - In-memory cache (30-min fresh, 60-min stale-on-error), backed by globalThis
 *   to survive Next.js HMR and request-worker recycling.
 * - In-flight promise dedupe to prevent thundering-herd on cache expiry.
 */

const API_BASE = "https://api.gitbook.com/v1"

const CACHE_FRESH_MS = 30 * 60 * 1000 // 30 min
const CACHE_STALE_MS = 60 * 60 * 1000 // 60 min — return stale on error up to this
const FETCH_TIMEOUT_MS = 5000
const HARD_PAGE_CAP = 2000 // per space; prevent runaway memory on misconfiguration

// URL-prefix → human-readable label. Pages on spaces whose published URL
// doesn't match a prefix here are excluded from the result.
const SITE_PREFIXES: Array<{ prefix: string; label: string }> = [
  { prefix: "https://docs.colect.io/user/", label: "User docs" },
  { prefix: "https://docs.colect.io/admin/", label: "Admin docs" },
]

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GitBookDoc {
  /** Stable page identifier (from GitBook). */
  id: string
  /** Page title. */
  title: string
  /** Optional page description/blurb (often empty in practice). */
  description: string | null
  /** Public URL to the page (space's published URL + page path). */
  url: string
  /** ISO timestamp of the last content update (page.updatedAt from GitBook). */
  publishedAt: string
  /** True when the page has never been edited since creation
   *  (createdAt ≈ updatedAt, within 60 seconds). */
  isNew: boolean
  /** Which site/space the page belongs to. */
  space: {
    id: string
    /** High-level group — "User docs" or "Admin docs". */
    label: string
    /** Specific space title — e.g., "Creator Studio" or "SOAP API".
     *  Equal to label for the main User/Admin Documentation spaces. */
    name: string
    /** Space's published base URL. */
    url: string
  }
}

// ---------------------------------------------------------------------------
// Cache (globalThis-scoped so it survives HMR and request-worker recycling)
// ---------------------------------------------------------------------------

type CacheState = {
  fresh: GitBookDoc[]
  lastSuccess: number // Date.now() of last successful fetch, 0 if never
  inflight: Promise<GitBookDoc[]> | null
}

const globalCacheKey = "__colectGitBookCache__" as const
type GlobalWithCache = typeof globalThis & { [globalCacheKey]?: CacheState }

function cache(): CacheState {
  const g = globalThis as GlobalWithCache
  if (!g[globalCacheKey]) {
    g[globalCacheKey] = { fresh: [], lastSuccess: 0, inflight: null }
  }
  return g[globalCacheKey]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return up to `limit` most-recently-updated GitBook documentation pages,
 * across all configured sites. Never throws — returns [] if the feature
 * is misconfigured or GitBook is unreachable.
 */
export async function getRecentlyUpdatedGitBookPages(
  limit: number = 10
): Promise<GitBookDoc[]> {
  const token = process.env.GITBOOK_API_TOKEN
  const orgId = process.env.GITBOOK_ORG_ID
  if (!token || !orgId) {
    // Feature flag: silently disabled if env is incomplete.
    return []
  }

  const c = cache()
  const now = Date.now()
  const age = now - c.lastSuccess

  // 1. Fresh hit → return directly.
  if (age < CACHE_FRESH_MS && c.lastSuccess > 0) {
    return c.fresh.slice(0, limit)
  }

  // 2. In-flight fetch → await the shared promise (thundering-herd dedupe).
  if (c.inflight) {
    try {
      const fresh = await c.inflight
      return fresh.slice(0, limit)
    } catch {
      // Fall through to stale handling.
    }
  }

  // 3. No fresh data and no in-flight → fire a new fetch.
  const fetchPromise = fetchAndSortAll(token, orgId)
    .then((result) => {
      c.fresh = result
      c.lastSuccess = Date.now()
      return result
    })
    .catch((err) => {
      console.error("[gitbook] Fetch failed:", err instanceof Error ? err.message : err)
      // Rethrow so the awaiting callers (dedupe path) see the error.
      throw err
    })
    .finally(() => {
      c.inflight = null
    })
  c.inflight = fetchPromise

  try {
    const fresh = await fetchPromise
    return fresh.slice(0, limit)
  } catch {
    // 4. Failure — serve stale if within the stale window.
    if (age < CACHE_STALE_MS && c.fresh.length > 0) {
      return c.fresh.slice(0, limit)
    }
    return []
  }
}

/**
 * Normalize a docs URL for dedup comparison between manual and auto entries.
 * Strips trailing slash, query string, and hash so
 *   "https://docs.colect.io/user/foo/?utm=bar#baz"
 * and
 *   "https://docs.colect.io/user/foo"
 * compare equal.
 */
export function normalizeDocUrl(url: string): string {
  try {
    const u = new URL(url)
    u.search = ""
    u.hash = ""
    let path = u.pathname
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1)
    return `${u.protocol}//${u.host}${path}`
  } catch {
    return url
  }
}

// ---------------------------------------------------------------------------
// Internal fetch pipeline
// ---------------------------------------------------------------------------

type SpaceSummary = {
  id: string
  label: string // high-level group: "User docs" / "Admin docs"
  name: string // specific space title: "User Documentation", "Creator Studio", …
  publishedUrl: string
}

/** Window (ms) within which createdAt≈updatedAt is considered "brand new". */
const NEW_PAGE_WINDOW_MS = 60 * 1000

async function fetchAndSortAll(token: string, orgId: string): Promise<GitBookDoc[]> {
  const spaces = await discoverInScopeSpaces(token, orgId)
  if (spaces.length === 0) return []

  const perSpace = await Promise.all(spaces.map((s) => fetchDocsForSpace(token, s)))
  const all = perSpace.flat()
  all.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0))
  return all
}

/**
 * List all spaces in the org; keep only those published under one of
 * SITE_PREFIXES. Safety net: spaces without a published URL are excluded.
 */
async function discoverInScopeSpaces(token: string, orgId: string): Promise<SpaceSummary[]> {
  const url = `${API_BASE}/orgs/${encodeURIComponent(orgId)}/spaces?limit=50`
  const raw = await gitbookFetch(url, token)
  const items: unknown = (raw as { items?: unknown[] })?.items
  if (!Array.isArray(items)) return []

  const out: SpaceSummary[] = []
  for (const raw of items) {
    const s = raw as {
      id?: string
      title?: string
      urls?: { published?: string | null }
    }
    const published = s.urls?.published
    if (!s.id || !published) continue
    const match = SITE_PREFIXES.find((p) => published.startsWith(p.prefix))
    if (!match) continue
    out.push({
      id: s.id,
      label: match.label,
      name: s.title || match.label,
      publishedUrl: published,
    })
  }
  return out
}

/**
 * Fetch one space's content tree, walk it, and return all `document` pages
 * mapped into GitBookDoc shape. Builds the public URL by concatenating the
 * space's published base URL with each page's `path`.
 */
async function fetchDocsForSpace(token: string, space: SpaceSummary): Promise<GitBookDoc[]> {
  const url = `${API_BASE}/spaces/${encodeURIComponent(space.id)}/content`
  const content = (await gitbookFetch(url, token)) as {
    pages?: unknown[]
  }
  const result: GitBookDoc[] = []
  const baseUrl = space.publishedUrl.replace(/\/$/, "") // strip trailing slash

  function walk(node: unknown) {
    if (result.length >= HARD_PAGE_CAP) return
    if (!node || typeof node !== "object") return
    const n = node as {
      id?: string
      title?: string
      description?: string
      type?: string
      path?: string
      createdAt?: string
      updatedAt?: string
      pages?: unknown[]
    }
    if (n.type === "document" && n.id && n.title && n.path && n.updatedAt) {
      // Paths occasionally have stray whitespace or mixed casing in GitBook.
      // Trim each segment and URL-encode just-in-case (spaces → %20 etc.).
      const safePath = n.path
        .split("/")
        .map((seg) => encodeURIComponent(seg.trim()))
        .filter(Boolean)
        .join("/")
      // A page is "new" when it has never been edited since creation:
      // createdAt and updatedAt match (within a small window to be safe).
      // This is conservative — subsequent tree restructures WILL bump
      // updatedAt, so an older untouched page that got restructured will
      // be labeled "Updated" not "New". Acceptable tradeoff.
      const cAt = n.createdAt ? Date.parse(n.createdAt) : NaN
      const uAt = Date.parse(n.updatedAt)
      const isNew =
        Number.isFinite(cAt) &&
        Number.isFinite(uAt) &&
        Math.abs(uAt - cAt) < NEW_PAGE_WINDOW_MS
      const description = typeof n.description === "string" && n.description.trim()
        ? n.description.trim()
        : null
      result.push({
        id: n.id,
        title: n.title.trim(),
        description,
        url: `${baseUrl}/${safePath}`,
        publishedAt: n.updatedAt,
        isNew,
        space: {
          id: space.id,
          label: space.label,
          name: space.name,
          url: space.publishedUrl,
        },
      })
    }
    if (Array.isArray(n.pages)) {
      for (const child of n.pages) walk(child)
    }
  }

  if (Array.isArray(content.pages)) {
    for (const p of content.pages) walk(p)
  }

  if (result.length >= HARD_PAGE_CAP) {
    console.warn(
      `[gitbook] Hit HARD_PAGE_CAP (${HARD_PAGE_CAP}) for space ${space.id}. ` +
        "Some pages were skipped. Consider raising the cap or narrowing the scope."
    )
  }

  return result
}

async function gitbookFetch(url: string, token: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    })
    if (!res.ok) {
      // 401 is especially important — make sure token expiry doesn't fail
      // silently forever. Log at error level so DO log-based alerts can fire.
      const level = res.status === 401 ? "error" : "warn"
      console[level](
        `[gitbook] ${res.status} ${res.statusText} for ${url.replace(/https?:\/\/[^/]+/, "")}`
      )
      throw new Error(`GitBook API returned ${res.status}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}
