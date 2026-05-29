import { NextRequest } from "next/server"
import { requireApiKey, isAuthResponse } from "@/lib/v1Auth"
import { ok, httpErrors, withV1Handler, getCanonicalOrigin } from "@/lib/v1Response"
import { prisma } from "@/lib/prisma"
import { getPresignedUrls } from "@/lib/s3"
import { assetPortalUrl, DOWNLOAD_URL_VALID_FOR_MS } from "@/lib/portalUrls"

export const dynamic = "force-dynamic"

interface RouteCtx {
  params: Promise<{ id: string }>
}

export const GET = withV1Handler<RouteCtx>(async (request: NextRequest, ctx) => {
  const auth = await requireApiKey(request)
  if (isAuthResponse(auth)) return auth

  const { id } = await ctx.params
  const asset = await prisma.asset.findFirst({
    where: { id, publishedAt: { not: null } },
    include: {
      variants: { orderBy: [{ displayOrder: "asc" }, { language: "asc" }] },
    },
  })
  if (!asset) return httpErrors.notFound("Asset not found or not published.")

  // Presign per-variant download URLs. Done in one batched call.
  const variantFileKeys = asset.variants.map((v) => v.fileUrl)
  const presignedFiles = await getPresignedUrls(variantFileKeys)

  const origin = getCanonicalOrigin(request)
  const downloadExpiresAt = new Date(Date.now() + DOWNLOAD_URL_VALID_FOR_MS).toISOString()

  return ok({
    id: asset.id,
    type: asset.type,
    title: asset.title,
    description: asset.description,
    thumbnailUrl: asset.thumbnailUrl,
    region: asset.region,
    persona: asset.persona,
    availableLanguages: asset.availableLanguages,
    campaignGoal: asset.campaignGoal,
    campaignLink: asset.campaignLink,
    sentAt: asset.sentAt?.toISOString() ?? null,
    isPinned: asset.isPinned,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
    publishedAt: asset.publishedAt?.toISOString() ?? null,
    portalUrl: assetPortalUrl(origin, asset.type, asset.id),
    downloads: asset.variants.map((v, i) => ({
      language: v.language,
      fileType: v.fileType,
      fileSize: v.fileSize,
      // Either a downloadable presigned URL or an external link, depending on
      // how this variant was uploaded by the admin.
      downloadUrl: presignedFiles[i],
      // Conservative expiry: agents should re-fetch this endpoint if they
      // hand the URL to a user later than this. Null when there's no
      // presigned URL (variant uses an external link).
      downloadUrlExpiresAt: presignedFiles[i] ? downloadExpiresAt : null,
      externalLink: v.externalLink,
    })),
  })
})
