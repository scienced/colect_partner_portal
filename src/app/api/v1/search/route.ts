import { NextRequest } from "next/server"
import { requireApiKey, isAuthResponse } from "@/lib/v1Auth"
import { ok, httpErrors, withV1Handler } from "@/lib/v1Response"
import { searchPortal, type SearchResultType } from "@/lib/v1Search"

export const dynamic = "force-dynamic"

const VALID_TYPES: SearchResultType[] = [
  "asset",
  "docs_update",
  "product_update",
  "team_member",
  "featured",
]

export const GET = withV1Handler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""

  if (q.length < 2) {
    return httpErrors.badRequest("Query parameter `q` must be at least 2 characters.")
  }

  const auth = await requireApiKey(request, { query: q })
  if (isAuthResponse(auth)) return auth

  const typesParam = searchParams.get("types")
  let types: SearchResultType[] | undefined
  if (typesParam) {
    const requested = typesParam.split(",").map((s) => s.trim().toLowerCase())
    const invalid = requested.filter((t) => !VALID_TYPES.includes(t as SearchResultType))
    if (invalid.length) {
      return httpErrors.badRequest(
        `Unknown types: ${invalid.join(", ")}. Allowed: ${VALID_TYPES.join(", ")}.`
      )
    }
    types = requested as SearchResultType[]
  }

  const limit = clampInt(searchParams.get("limitPerType"), 1, 25, 5)

  // Same-origin URLs in results so agents can render clickable portal links.
  const origin = new URL(request.url).origin
  const items = await searchPortal({ query: q, types, limitPerType: limit, origin })

  return ok({ query: q, items, total: items.length })
})

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(min, Math.min(max, n))
}
