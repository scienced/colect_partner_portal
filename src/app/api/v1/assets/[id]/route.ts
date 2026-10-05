import { NextRequest } from "next/server"
import { requireApiKey, isAuthResponse, SCOPE_WRITE } from "@/lib/v1Auth"
import { ok, httpErrors, withV1Handler, getCanonicalOrigin } from "@/lib/v1Response"
import { prisma } from "@/lib/prisma"
import { assetAccessWhere } from "@/lib/access"
import { AssetWriteError, updateAsset } from "@/lib/assetWrites"
import {
  V1InputError,
  V1UpdateAssetSchema,
  apiChangeNote,
  canWriteContent,
  serializeAssetDetail,
  toUpdateInput,
  zodMessage,
} from "@/lib/v1Content"

export const dynamic = "force-dynamic"

interface RouteCtx {
  params: Promise<{ id: string }>
}

export const GET = withV1Handler<RouteCtx>(async (request: NextRequest, ctx) => {
  const auth = await requireApiKey(request)
  if (isAuthResponse(auth)) return auth

  const { id } = await ctx.params
  // Keys with content write access (admins) also see drafts, so an agent can
  // read back what it created before publishing it.
  const asset = await prisma.asset.findFirst({
    where: {
      id,
      ...(canWriteContent(auth) ? {} : { publishedAt: { not: null } }),
      ...assetAccessWhere(auth.viewer),
    },
    include: {
      variants: { orderBy: [{ displayOrder: "asc" }, { language: "asc" }] },
    },
  })
  if (!asset) return httpErrors.notFound("Asset not found or not published.")

  return ok(await serializeAssetDetail(asset, auth.viewer, getCanonicalOrigin(request)))
})

// PATCH: edit an asset (write-scoped admin keys only). Only the fields sent
// change; `files`, when sent, replaces every language version.
export const PATCH = withV1Handler<RouteCtx>(async (request: NextRequest, ctx) => {
  const auth = await requireApiKey(request, { scope: SCOPE_WRITE })
  if (isAuthResponse(auth)) return auth

  const { id } = await ctx.params
  const json = await request.json().catch(() => null)
  const parsed = V1UpdateAssetSchema.safeParse(json)
  if (!parsed.success) return httpErrors.badRequest(zodMessage(parsed.error))
  if (Object.keys(parsed.data).length === 0) return httpErrors.badRequest("Nothing to update.")

  const existing = await prisma.asset.findUnique({ where: { id }, select: { publishedAt: true, type: true } })
  if (!existing) return httpErrors.notFound("Asset not found.")
  if (existing.type === "SOCIAL_AD") {
    return httpErrors.badRequest("This is a social ad set — edit it with PATCH /api/v1/social-ads/{id}.")
  }

  try {
    const input = await toUpdateInput(parsed.data, existing)
    const asset = await updateAsset(id, input, apiChangeNote(auth))
    return ok(await serializeAssetDetail(asset, auth.viewer, getCanonicalOrigin(request)))
  } catch (e) {
    if (e instanceof V1InputError) return httpErrors.badRequest(e.message)
    if (e instanceof AssetWriteError) {
      return e.status === 404 ? httpErrors.notFound(e.message) : httpErrors.badRequest(e.message)
    }
    throw e
  }
})
