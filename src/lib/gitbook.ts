/**
 * GitBook client for fetching recently-updated pages from Colect's public
 * documentation sites (docs.colect.io/user and docs.colect.io/admin).
 *
 * - Server-only module (never import from client components).
 * - Auth via GITBOOK_API_TOKEN env var (Bearer token, format gb_api_*).
 * - Scoped to GITBOOK_ORG_ID env var (Colect org on GitBook).
 * - Feature-flagged by env-var presence: returns [] silently if misconfigured.
 * - In-memory cache backed by globalThis (survives HMR / worker recycling),
 *   stale-while-revalidate: after 30 min the cached list is still served
 *   instantly while a background fetch refreshes it. A full fetch walks every
 *   space's page tree and takes ~3–4 s, so no request should ever wait on it
 *   once there is data. Only a cold cache waits, and only up to `maxWaitMs`.
 * - The cache is warmed at server start (src/instrumentation.ts), so even the
 *   first visitor after a deploy normally gets cached data.
 * - In-flight promise dedupe to prevent thundering-herd on cache expiry.
 */

const API_BASE = "https://api.gitbook.com/v1"

const CACHE_FRESH_MS = 30 * 60 * 1000 // 30 min — after this, refresh in the background
const CACHE_MAX_STALE_MS = 24 * 60 * 60 * 1000 // serve stale data for up to a day
const DEFAULT_MAX_WAIT_MS = 1500 // cold cache: how long a page may wait for GitBook
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
  limit: number = 10,
  opts: { maxWaitMs?: number } = {}
): Promise<GitBookDoc[]> {
  const token = process.env.GITBOOK_API_TOKEN
  const orgId = process.env.GITBOOK_ORG_ID
  if (!token || !orgId) {
    // Feature flag: silently disabled if env is incomplete.
    return []
  }

  const c = cache()
  const hasData = c.lastSuccess > 0
  const age = Date.now() - c.lastSuccess

  // 1. Fresh hit → return directly.
  if (hasData && age < CACHE_FRESH_MS) {
    return c.fresh.slice(0, limit)
  }

  // 2. Stale but usable → serve it now, refresh in the background.
  if (hasData && age < CACHE_MAX_STALE_MS) {
    startFetch(token, orgId).catch(() => {}) // errors already logged; keep stale data
    return c.fresh.slice(0, limit)
  }

  // 3. Cold (or day-old) cache → wait for a fetch, but never longer than
  //    maxWaitMs. If GitBook is slower, the page renders without the auto
  //    entries and the fetch keeps running to fill the cache for next time.
  const maxWaitMs = opts.maxWaitMs ?? DEFAULT_MAX_WAIT_MS
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), maxWaitMs)
  })
  const result = await Promise.race([startFetch(token, orgId).catch(() => null), timeout])
  clearTimeout(timer)
  if (result) return result.slice(0, limit)
  return hasData ? c.fresh.slice(0, limit) : []
}

/** Start (or join) the single in-flight fetch that refreshes the cache. */
function startFetch(token: string, orgId: string): Promise<GitBookDoc[]> {
  const c = cache()
  if (c.inflight) return c.inflight
  const started = Date.now()
  c.inflight = fetchAndSortAll(token, orgId)
    .then((result) => {
      c.fresh = result
      c.lastSuccess = Date.now()
      console.log(`[gitbook] refreshed ${result.length} pages in ${Date.now() - started} ms`)
      return result
    })
    .catch((err) => {
      console.error("[gitbook] Fetch failed:", err instanceof Error ? err.message : err)
      throw err
    })
    .finally(() => {
      c.inflight = null
    })
  return c.inflight
}

/** Fill the cache ahead of the first request (called at server start). */
export async function warmGitBookCache(): Promise<void> {
  await getRecentlyUpdatedGitBookPages(1, { maxWaitMs: 30_000 })
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
