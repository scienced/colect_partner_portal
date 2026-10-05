import { NextRequest } from "next/server"
import { requireApiKey, isAuthResponse, SCOPE_WRITE } from "@/lib/v1Auth"
import { ok, httpErrors, withV1Handler } from "@/lib/v1Response"
import { canWriteContent, apiChangeNote, zodMessage } from "@/lib/v1Content"
import { AdSetInputError, UpdateAdSetSchema, findAdSets, serializeAdSets, updateAdSet } from "@/lib/adSets"

export const dynamic = "force-dynamic"

interface RouteCtx {
  params: Promise<{ id: string }>
}

export const GET = withV1Handler<RouteCtx>(async (request: NextRequest, ctx) => {
  const auth = await requireApiKey(request)
  if (isAuthResponse(auth)) return auth
  const { id } = await ctx.params
  const { rows } = await findAdSets(auth.viewer, { id, includeDrafts: canWriteContent(auth) })
  if (!rows[0]) return httpErrors.notFound("Ad set not found or not published.")
  const [item] = await serializeAdSets(rows, auth.viewer)
  return ok(item)
})

// PATCH: edit an ad set. `media` / `copies`, when sent, replace the full list.
export const PATCH = withV1Handler<RouteCtx>(async (request: NextRequest, ctx) => {
  const auth = await requireApiKey(request, { scope: SCOPE_WRITE })
  if (isAuthResponse(auth)) return auth
  const { id } = await ctx.params

  const parsed = UpdateAdSetSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return httpErrors.badRequest(zodMessage(parsed.error))
  if (Object.keys(parsed.data).length === 0) return httpErrors.badRequest("Nothing to update.")
  try {
    const row = await updateAdSet(id, parsed.data, apiChangeNote(auth))
    const [item] = await serializeAdSets([row], auth.viewer)
    return ok(item)
  } catch (e) {
    if (e instanceof AdSetInputError) {
      return e.message === "NOT_FOUND" ? httpErrors.notFound("Ad set not found.") : httpErrors.badRequest(e.message)
    }
    throw e
  }
})
