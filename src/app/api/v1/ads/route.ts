import { NextRequest } from "next/server"
import { requireApiKey, isAuthResponse, SCOPE_WRITE } from "@/lib/v1Auth"
import { ok, httpErrors, withV1Handler } from "@/lib/v1Response"
import { canWriteContent, apiChangeNote, zodMessage } from "@/lib/v1Content"
import { AdSetInputError, CreateAdSetSchema, createAdSet, findAdSets, serializeAdSets } from "@/lib/adSets"

export const dynamic = "force-dynamic"

// GET: social ad sets (visuals + copy) the key's owner may see.
export const GET = withV1Handler(async (request: NextRequest) => {
  const auth = await requireApiKey(request)
  if (isAuthResponse(auth)) return auth

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")?.toLowerCase() || "published"
  if (!["published", "all"].includes(status)) return httpErrors.badRequest("`status` must be published or all.")
  if (status === "all" && !canWriteContent(auth)) {
    return httpErrors.forbidden("Only keys with content write access can list drafts.")
  }
  const brand = searchParams.get("brand")?.toUpperCase() || null
  if (auth.viewer.isEmployee && brand && !["COLECT", "LE_NEW_BLACK", "BOTH"].includes(brand)) {
    return httpErrors.badRequest("`brand` must be COLECT, LE_NEW_BLACK or BOTH.")
  }
  const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") || "20", 10) || 20, 1), 50)
  const offset = Math.max(Number.parseInt(searchParams.get("offset") || "0", 10) || 0, 0)

  const { rows, total } = await findAdSets(auth.viewer, {
    includeDrafts: status === "all",
    brand,
    take: limit,
    skip: offset,
  })
  return ok({
    items: await serializeAdSets(rows, auth.viewer),
    total,
    limit,
    offset,
    nextOffset: offset + rows.length < total ? offset + rows.length : null,
  })
})

// POST: create an ad set (write-scoped admin keys only).
export const POST = withV1Handler(async (request: NextRequest) => {
  const auth = await requireApiKey(request, { scope: SCOPE_WRITE })
  if (isAuthResponse(auth)) return auth

  const parsed = CreateAdSetSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return httpErrors.badRequest(zodMessage(parsed.error))
  try {
    const row = await createAdSet(parsed.data, apiChangeNote(auth))
    const [item] = await serializeAdSets([row], auth.viewer)
    return ok(item, { status: 201 })
  } catch (e) {
    if (e instanceof AdSetInputError) return httpErrors.badRequest(e.message)
    throw e
  }
})
