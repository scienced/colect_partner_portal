import { z } from "zod"
import type { Asset, AssetVariant } from "@prisma/client"
import { UserRole } from "@prisma/client"
import { canonicalLanguage, SUPPORTED_LANGUAGES } from "@/lib/assetVariants"
import { BrandSchema, VisibilitySchema, type CreateAssetInput, type UpdateAssetInput } from "@/lib/assetWrites"
import { internalAssetFields, type Viewer } from "@/lib/access"
import { bucketUrlForKey, getObjectBuffer, getPresignedUrls, headObject, ourBucketKeyFromUrl } from "@/lib/s3"
import { processAndUploadThumbnail } from "@/lib/thumbnails"
import { assetPortalUrl, DOWNLOAD_URL_VALID_FOR_MS } from "@/lib/portalUrls"
import { SCOPE_WRITE, type V1Auth } from "@/lib/v1Auth"

/**
 * Agent-facing content writes for /api/v1/assets (POST/PATCH) and the MCP
 * write tools. The request shape is deliberately simpler than the admin
 * form's: `files` instead of variants, `publish` instead of timestamps, no
 * pinning. Everything is converted to the admin input shape and goes through
 * the same createAsset/updateAsset as the dashboard.
 */

/** Folders an agent's uploaded file may live in (see POST /api/v1/uploads). */
export const FILE_UPLOAD_FOLDERS = ["assets/", "campaigns/", "videos/"] as const
/** Staging folder for raw thumbnail images before processing. */
export const THUMBNAIL_STAGING_FOLDER = "uploads/"
const MAX_THUMBNAIL_SOURCE_BYTES = 10 * 1024 * 1024

export function canWriteContent(auth: Pick<V1Auth, "apiKey" | "user">): boolean {
  return auth.apiKey.scopes.includes(SCOPE_WRITE) && auth.user.role === UserRole.ADMIN
}

const LanguageSchema = z.string().transform((code, ctx) => {
  try {
    return canonicalLanguage(code)
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unsupported language "${code}". Use one of: ${SUPPORTED_LANGUAGES.join(", ")}`,
    })
    return z.NEVER
  }
})

const httpUrl = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), { message: "Must be an http(s) URL" })

const V1FileSchema = z
  .object({
    language: LanguageSchema,
    fileUrl: httpUrl.optional().describe("`fileUrl` returned by POST /api/v1/uploads"),
    externalLink: httpUrl.optional(),
  })
  .strict()
  .refine((f) => f.fileUrl || f.externalLink, {
    message: "Each file needs a fileUrl (from POST /api/v1/uploads), an externalLink, or both",
  })

const filesSchema = z
  .array(V1FileSchema)
  .min(1)
  .max(SUPPORTED_LANGUAGES.length)
  .refine((v) => new Set(v.map((f) => f.language)).size === v.length, {
    message: "Each language can only appear once",
  })

const commonFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  brand: BrandSchema.nullable().optional(),
  publish: z.boolean().optional(),
  thumbnailUrl: httpUrl.nullable().optional(),
  persona: z.array(z.string().max(50)).max(10).optional(),
  region: z.array(z.string().max(50)).max(10).optional(),
  campaignGoal: z.string().max(500).nullable().optional(),
  campaignLink: httpUrl.nullable().optional(),
  sentAt: z.string().datetime().nullable().optional(),
}

export const V1CreateAssetSchema = z
  .object({
    type: z.enum(["DECK", "CAMPAIGN", "ASSET", "VIDEO"]),
    ...commonFields,
    // Required on create: an agent must decide explicitly who sees new content.
    visibility: VisibilitySchema,
    files: filesSchema,
  })
  .strict()

export const V1UpdateAssetSchema = z
  .object({
    type: z.enum(["DECK", "CAMPAIGN", "ASSET", "VIDEO"]).optional(),
    ...commonFields,
    title: commonFields.title.optional(),
    visibility: VisibilitySchema.optional(),
    // When present, replaces ALL language versions of the asset.
    files: filesSchema.optional(),
  })
  .strict()

export type V1CreateAssetBody = z.infer<typeof V1CreateAssetSchema>
export type V1UpdateAssetBody = z.infer<typeof V1UpdateAssetSchema>

/** Input that doesn't hold up against S3 — returned to the client as a 400. */
export class V1InputError extends Error {}

async function resolveFiles(files: V1CreateAssetBody["files"]) {
  return Promise.all(
    files.map(async (f, idx) => {
      let fileUrl: string | null = null
      let fileType: string | null = null
      let fileSize: number | null = null
      if (f.fileUrl) {
        const key = ourBucketKeyFromUrl(f.fileUrl)
        if (!key || !FILE_UPLOAD_FOLDERS.some((p) => key.startsWith(p))) {
          throw new V1InputError(
            `files[${idx}].fileUrl must be a fileUrl returned by POST /api/v1/uploads (purpose "file").`
          )
        }
        const head = await headObject(key)
        if (!head) {
          throw new V1InputError(
            `files[${idx}].fileUrl: nothing has been uploaded there yet. PUT the file to the uploadUrl first.`
          )
        }
        fileUrl = bucketUrlForKey(key)
        fileType = head.contentType
        fileSize = head.contentLength
      }
      return {
        language: f.language,
        fileUrl,
        fileType,
        fileSize,
        externalLink: f.externalLink ?? null,
        displayOrder: idx,
      }
    })
  )
}

/**
 * A thumbnail is either a freshly uploaded image in the staging folder (we
 * resize it and generate the blur placeholder, like the admin uploader) or an
 * already-processed portal thumbnail being reused.
 */
async function resolveThumbnail(url: string): Promise<{ thumbnailUrl: string; blurDataUrl: string | null }> {
  const key = ourBucketKeyFromUrl(url)
  if (key?.startsWith("thumbnails/")) return { thumbnailUrl: bucketUrlForKey(key), blurDataUrl: null }
  if (!key?.startsWith(THUMBNAIL_STAGING_FOLDER)) {
    throw new V1InputError('thumbnailUrl must be a fileUrl returned by POST /api/v1/uploads (purpose "thumbnail").')
  }
  const head = await headObject(key)
  if (!head) throw new V1InputError("thumbnailUrl: nothing has been uploaded there yet. PUT the image first.")
  if (!head.contentType?.startsWith("image/")) throw new V1InputError("thumbnailUrl must be an image.")
  if ((head.contentLength ?? 0) > MAX_THUMBNAIL_SOURCE_BYTES) {
    throw new V1InputError("Thumbnail image is larger than 10MB.")
  }
  const buffer = await getObjectBuffer(key)
  const processed = await processAndUploadThumbnail(buffer, key.split("/").pop() || "thumbnail")
  return { thumbnailUrl: processed.thumbnailUrl, blurDataUrl: processed.blurDataUrl }
}

export async function toCreateInput(body: V1CreateAssetBody): Promise<CreateAssetInput> {
  const variants = await resolveFiles(body.files)
  const thumb = body.thumbnailUrl ? await resolveThumbnail(body.thumbnailUrl) : null
  return {
    type: body.type,
    title: body.title,
    description: body.description ?? undefined,
    thumbnailUrl: thumb?.thumbnailUrl,
    blurDataUrl: thumb?.blurDataUrl ?? undefined,
    region: body.region ?? [],
    persona: body.persona ?? [],
    visibility: body.visibility,
    brand: body.brand ?? null,
    variants,
    campaignGoal: body.campaignGoal ?? undefined,
    campaignLink: body.campaignLink ?? undefined,
    sentAt: body.sentAt ?? null,
    // Agents create drafts unless they explicitly publish.
    publishedAt: body.publish ? new Date().toISOString() : null,
    isPinned: false,
    pinOrder: 0,
  }
}

export async function toUpdateInput(
  body: V1UpdateAssetBody,
  existing: Pick<Asset, "publishedAt">
): Promise<UpdateAssetInput> {
  const out: UpdateAssetInput = {}
  if (body.type !== undefined) out.type = body.type
  if (body.title !== undefined) out.title = body.title
  if (body.description !== undefined) out.description = body.description
  if (body.visibility !== undefined) out.visibility = body.visibility
  if (body.brand !== undefined) out.brand = body.brand
  if (body.persona !== undefined) out.persona = body.persona
  if (body.region !== undefined) out.region = body.region
  if (body.campaignGoal !== undefined) out.campaignGoal = body.campaignGoal
  if (body.campaignLink !== undefined) out.campaignLink = body.campaignLink
  if (body.sentAt !== undefined) out.sentAt = body.sentAt
  if (body.files !== undefined) out.variants = await resolveFiles(body.files)
  if (body.thumbnailUrl !== undefined) {
    if (body.thumbnailUrl === null) {
      out.thumbnailUrl = null
      out.blurDataUrl = null
    } else {
      const thumb = await resolveThumbnail(body.thumbnailUrl)
      out.thumbnailUrl = thumb.thumbnailUrl
      out.blurDataUrl = thumb.blurDataUrl
    }
  }
  if (body.publish !== undefined) {
    // Keep the original publish date when re-publishing a live asset.
    out.publishedAt = body.publish
      ? (existing.publishedAt ?? new Date()).toISOString()
      : null
  }
  return out
}

/**
 * Full asset detail as returned by GET /api/v1/assets/{id} and by the write
 * endpoints, so an agent sees exactly what it just created.
 */
export async function serializeAssetDetail(
  asset: Asset & { variants: AssetVariant[] },
  viewer: Viewer,
  origin: string
) {
  const variants = [...asset.variants].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.language.localeCompare(b.language)
  )
  // Presign per-variant download URLs. Done in one batched call.
  const presignedFiles = await getPresignedUrls(variants.map((v) => v.fileUrl))
  const downloadExpiresAt = new Date(Date.now() + DOWNLOAD_URL_VALID_FOR_MS).toISOString()

  return {
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
    published: asset.publishedAt !== null,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
    publishedAt: asset.publishedAt?.toISOString() ?? null,
    ...internalAssetFields(viewer, asset),
    portalUrl: assetPortalUrl(origin, asset.type, asset.id),
    downloads: variants.map((v, i) => ({
      language: v.language,
      fileType: v.fileType,
      fileSize: v.fileSize,
      // Either a downloadable presigned URL or an external link, depending on
      // how this variant was uploaded.
      downloadUrl: presignedFiles[i],
      // Conservative expiry: agents should re-fetch this endpoint if they
      // hand the URL to a user later than this. Null when there's no
      // presigned URL (variant uses an external link).
      downloadUrlExpiresAt: presignedFiles[i] ? downloadExpiresAt : null,
      externalLink: v.externalLink,
    })),
  }
}

/** Changelog note so the audit trail shows which key made an agent change. */
export function apiChangeNote(auth: Pick<V1Auth, "apiKey" | "user" | "source">): string {
  const via = auth.source === "MCP_QUERY" ? "MCP" : "API"
  return `via ${via} key "${auth.apiKey.label}" (${auth.apiKey.prefix}) by ${auth.user.email}`
}

/** Flatten a ZodError into one readable line for the `{error:{message}}` envelope. */
export function zodMessage(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.length ? i.path.join(".") : "body"}: ${i.message}`)
    .join("; ")
}
