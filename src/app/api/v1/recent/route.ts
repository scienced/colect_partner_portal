import { NextRequest } from "next/server"
import { requireApiKey, isAuthResponse } from "@/lib/v1Auth"
import { ok, httpErrors, withV1Handler } from "@/lib/v1Response"
import { prisma } from "@/lib/prisma"
import { assetPortalUrl } from "@/lib/portalUrls"

export const dynamic = "force-dynamic"

/**
 * Unified "what's new" feed across partner-visible content types, sorted by
 * `updatedAt` descending. Built because the bare list endpoints make
 * "what changed in the portal lately?" a multi-call client-side merge — and
 * that's the single most common question an agent gets asked.
 *
 * We intentionally don't expose the internal Changelog table (it's an admin
 * audit trail; partners don't see it in the UI, so the API doesn't expose it
 * either — see memory: api-scope-mirrors-ui).
 */

const VALID_TYPES = ["asset", "docs_update", "product_update"] as const
type RecentType = (typeof VALID_TYPES)[number]

interface RecentItem {
  type: RecentType
  id: string
  title: string
  url: string
  updatedAt: string
  meta?: Record<string, unknown>
}

export const GET = withV1Handler(async (request: NextRequest) => {
  const auth = await requireApiKey(request)
  if (isAuthResponse(auth)) return auth

  const { searchParams } = new URL(request.url)

  // ?types= filter
  const typesParam = searchParams.get("types")
  let types: RecentType[] = [...VALID_TYPES]
  if (typesParam) {
    const requested = typesParam.split(",").map((s) => s.trim().toLowerCase())
    const invalid = requested.filter((t) => !(VALID_TYPES as readonly string[]).includes(t))
    if (invalid.length) {
      return httpErrors.badRequest(
        `Unknown types: ${invalid.join(", ")}. Allowed: ${VALID_TYPES.join(", ")}.`
      )
    }
    types = requested as RecentType[]
  }

  // ?since= filter (ISO 8601)
  let since: Date | undefined
  const sinceRaw = searchParams.get("since")
  if (sinceRaw) {
    const parsed = new Date(sinceRaw)
    if (Number.isNaN(parsed.getTime())) {
      return httpErrors.badRequest("`since` must be a valid ISO 8601 timestamp.")
    }
    since = parsed
  }

  const limit = clampInt(searchParams.get("limit"), 1, 100, 20)
  const origin = new URL(request.url).origin
  const updatedAtFilter = since ? { gt: since } : undefined

  // Over-fetch from each type so the merge has enough range to fill `limit`
  // after cross-type sorting.
  const perType = limit

  const tasks: Promise<RecentItem[]>[] = []
  if (types.includes("asset")) {
    tasks.push(
      prisma.asset
        .findMany({
          where: { publishedAt: { not: null }, updatedAt: updatedAtFilter },
          orderBy: { updatedAt: "desc" },
          take: perType,
          select: { id: true, type: true, title: true, updatedAt: true },
        })
        .then((rows) =>
          rows.map((a) => ({
            type: "asset" as const,
            id: a.id,
            title: a.title,
            url: assetPortalUrl(origin, a.type, a.id),
            updatedAt: a.updatedAt.toISOString(),
            meta: { assetType: a.type },
          }))
        )
    )
  }
  if (types.includes("docs_update")) {
    tasks.push(
      prisma.docsUpdate
        .findMany({
          where: { publishedAt: { not: null }, updatedAt: updatedAtFilter },
          orderBy: { updatedAt: "desc" },
          take: perType,
          select: { id: true, title: true, deepLink: true, updatedAt: true, category: true },
        })
        .then((rows) =>
          rows.map((d) => ({
            type: "docs_update" as const,
            id: d.id,
            title: d.title,
            url: d.deepLink || `${origin}/docs-updates`,
            updatedAt: d.updatedAt.toISOString(),
            meta: { category: d.category },
          }))
        )
    )
  }
  if (types.includes("product_update")) {
    tasks.push(
      prisma.productUpdate
        .findMany({
          where: { publishedAt: { not: null }, updatedAt: updatedAtFilter },
          orderBy: { updatedAt: "desc" },
          take: perType,
          select: { id: true, title: true, updateType: true, releaseDate: true, updatedAt: true },
        })
        .then((rows) =>
          rows.map((p) => ({
            type: "product_update" as const,
            id: p.id,
            title: p.title,
            url: `${origin}/product`,
            updatedAt: p.updatedAt.toISOString(),
            meta: {
              updateType: p.updateType,
              releaseDate: p.releaseDate?.toISOString() ?? null,
            },
          }))
        )
    )
  }

  const batches = await Promise.all(tasks)
  const merged = batches.flat()
  merged.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
  const items = merged.slice(0, limit)

  return ok({
    items,
    total: items.length,
    limit,
    since: since?.toISOString() ?? null,
  })
})

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(min, Math.min(max, n))
}
