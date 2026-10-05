import { NextRequest } from "next/server"
import { z } from "zod"
import { requireApiKey, isAuthResponse, SCOPE_WRITE } from "@/lib/v1Auth"
import { ok, httpErrors, withV1Handler } from "@/lib/v1Response"
import { getPresignedUploadUrl } from "@/lib/s3"
import { zodMessage } from "@/lib/v1Content"

export const dynamic = "force-dynamic"

const UPLOAD_URL_TTL_SECONDS = 3600 // matches getPresignedUploadUrl

const UploadSchema = z
  .object({
    filename: z.string().trim().min(1).max(200),
    contentType: z.string().trim().min(3).max(100),
    // "file" = the asset's downloadable file; "thumbnail" = a cover image we
    // resize into the portal thumbnail when the asset is created/updated.
    purpose: z.enum(["file", "thumbnail"]).default("file"),
    // Picks the storage folder for files, mirroring the admin uploader.
    assetType: z.enum(["DECK", "CAMPAIGN", "ASSET", "VIDEO", "SOCIAL_AD"]).optional(),
  })
  .strict()

/**
 * Step 1 of an agent upload: get a short-lived URL to PUT the bytes to.
 * Step 2: PUT the file there with the same Content-Type.
 * Step 3: pass the returned `fileUrl` to POST/PATCH /api/v1/assets.
 */
export const POST = withV1Handler(async (request: NextRequest) => {
  const auth = await requireApiKey(request, { scope: SCOPE_WRITE })
  if (isAuthResponse(auth)) return auth

  const json = await request.json().catch(() => null)
  const parsed = UploadSchema.safeParse(json)
  if (!parsed.success) return httpErrors.badRequest(zodMessage(parsed.error))
  const { filename, contentType, purpose, assetType } = parsed.data

  if (purpose === "thumbnail" && !contentType.startsWith("image/")) {
    return httpErrors.badRequest("Thumbnails must be images (contentType image/*).")
  }

  const folder =
    purpose === "thumbnail"
      ? "uploads"
      : assetType === "SOCIAL_AD"
      ? "social-ads"
      : assetType === "VIDEO"
      ? "videos"
      : assetType === "CAMPAIGN"
      ? "campaigns"
      : "assets"

  const { uploadUrl, fileUrl } = await getPresignedUploadUrl(filename, contentType, folder)

  return ok({
    uploadUrl,
    method: "PUT",
    // The signature covers Content-Type: send exactly this header with the PUT.
    headers: { "Content-Type": contentType },
    fileUrl,
    purpose,
    expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000).toISOString(),
    next:
      purpose === "thumbnail"
        ? "PUT the image to uploadUrl, then pass fileUrl as `thumbnailUrl` to POST /api/v1/assets or PATCH /api/v1/assets/{id}."
        : assetType === "SOCIAL_AD"
        ? "PUT the file to uploadUrl, then pass fileUrl in `media[].fileUrl` to POST /api/v1/ads or PATCH /api/v1/ads/{id}."
        : "PUT the file to uploadUrl, then pass fileUrl in `files[].fileUrl` to POST /api/v1/assets or PATCH /api/v1/assets/{id}.",
  })
})
