import { z } from "zod"
import type { AdCopy, Asset, AssetMedia, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createChangelog } from "@/lib/changelog"
import { assetAccessWhere, internalAssetFields, type Viewer } from "@/lib/access"
import { canonicalLanguage, SUPPORTED_LANGUAGES } from "@/lib/assetVariants"
import { BrandSchema, VisibilitySchema } from "@/lib/assetWrites"
import { getObjectBuffer, getPresignedUrls, headObject, ourBucketKeyFromUrl, bucketUrlForKey } from "@/lib/s3"
import { processAndUploadThumbnail } from "@/lib/thumbnails"

/**
 * Social ad sets — one Asset row (type SOCIAL_AD) holding many visuals
 * (AssetMedia, in order) and one or more copy versions (AdCopy). One ad set
 * per campaign keeps the Social ads page from filling up with single ads.
 *
 * Shared by the admin routes (/api/social-ads), the portal page
 * (/api/portal/social-ads) and the agent API (/api/v1/social-ads + MCP).
 */

/** Storage folder for ad visuals (private, presigned on read). */
export const AD_MEDIA_FOLDER = "social-ads/"
export const AD_PLATFORMS = ["LINKEDIN"] as const
export const MAX_AD_MEDIA = 30
export const MAX_AD_COPIES = 10
const MAX_THUMBNAIL_SOURCE_BYTES = 15 * 1024 * 1024

export class AdSetInputError extends Error {}

const optionalLanguage = z
  .string()
  .nullable()
  .optional()
  .transform((code, ctx) => {
    if (!code) return null
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

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null))

export const AdMediaInputSchema = z
  .object({
    fileUrl: z.string().min(1),
    fileName: z.string().max(255).nullable().optional(),
  })
  .strict()

export const AdCopyInputSchema = z
  .object({
    language: optionalLanguage,
    label: optionalText(80),
    introText: z.string().trim().min(1, "Intro text is required").max(3000),
    headline: optionalText(200),
    description: optionalText(300),
    ctaLabel: optionalText(40),
    destinationUrl: z
      .string()
      .url()
      .refine((u) => /^https?:\/\//i.test(u), { message: "Must be an http(s) URL" })
      .nullable()
      .optional()
      .or(z.literal("").transform(() => null)),
  })
  .strict()

const adSetFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  visibility: VisibilitySchema,
  brand: BrandSchema.nullable().optional(),
  adPlatform: z.enum(AD_PLATFORMS).default("LINKEDIN"),
  publish: z.boolean().optional(),
  media: z.array(AdMediaInputSchema).min(1, "Add at least one visual").max(MAX_AD_MEDIA),
  copies: z.array(AdCopyInputSchema).max(MAX_AD_COPIES).default([]),
}

export const CreateAdSetSchema = z.object(adSetFields).strict()
export const UpdateAdSetSchema = z
  .object({
    ...adSetFields,
    title: adSetFields.title.optional(),
    visibility: adSetFields.visibility.optional(),
    adPlatform: z.enum(AD_PLATFORMS).optional(),
    media: adSetFields.media.optional(),
    copies: z.array(AdCopyInputSchema).max(MAX_AD_COPIES).optional(),
  })
  .strict()

export type CreateAdSetInput = z.infer<typeof CreateAdSetSchema>
export type UpdateAdSetInput = z.infer<typeof UpdateAdSetSchema>

export type AdSetRow = Asset & { media: AssetMedia[]; adCopies: AdCopy[] }

const adSetInclude = {
  media: { orderBy: { displayOrder: "asc" as const } },
  adCopies: { orderBy: { displayOrder: "asc" as const } },
}

/** Validate each visual against storage and fill in type/size from S3. */
async function resolveMedia(media: CreateAdSetInput["media"]) {
  return Promise.all(
    media.map(async (m, idx) => {
      const key = ourBucketKeyFromUrl(m.fileUrl)
      if (!key || !key.startsWith(AD_MEDIA_FOLDER)) {
        throw new AdSetInputError(
          `media[${idx}].fileUrl must be an uploaded ad visual (upload with assetType SOCIAL_AD).`
        )
      }
      const head = await headObject(key)
      if (!head) {
        throw new AdSetInputError(`media[${idx}]: nothing has been uploaded there yet. PUT the file first.`)
      }
      return {
        fileUrl: bucketUrlForKey(key),
        fileName: m.fileName ?? key.split("/").pop()?.replace(/^\d+-/, "") ?? null,
        fileType: head.contentType,
        fileSize: head.contentLength,
        displayOrder: idx,
      }
    })
  )
}

/** Card thumbnail from the first image visual. Null if there's no image. */
async function thumbnailFromMedia(media: { fileUrl: string; fileType: string | null; fileSize: number | null }[]) {
  const firstImage = media.find((m) => m.fileType?.startsWith("image/"))
  if (!firstImage || (firstImage.fileSize ?? 0) > MAX_THUMBNAIL_SOURCE_BYTES) {
    return { thumbnailUrl: null, blurDataUrl: null }
  }
  const key = ourBucketKeyFromUrl(firstImage.fileUrl)!
  try {
    const processed = await processAndUploadThumbnail(await getObjectBuffer(key), key.split("/").pop() || "ad")
    return { thumbnailUrl: processed.thumbnailUrl, blurDataUrl: processed.blurDataUrl }
  } catch (e) {
    // A broken or exotic image shouldn't block saving the ad set.
    console.error("[ad-sets] thumbnail generation failed:", e)
    return { thumbnailUrl: null, blurDataUrl: null }
  }
}

function copyRows(copies: CreateAdSetInput["copies"]) {
  return copies.map((c, idx) => ({
    language: c.language ?? null,
    label: c.label ?? null,
    introText: c.introText,
    headline: c.headline ?? null,
    description: c.description ?? null,
    ctaLabel: c.ctaLabel ?? null,
    destinationUrl: c.destinationUrl ?? null,
    displayOrder: idx,
  }))
}

function copyLanguages(copies: { language: string | null }[]): string[] {
  return Array.from(new Set(copies.map((c) => c.language).filter((l): l is string => !!l))).sort()
}

export async function createAdSet(input: CreateAdSetInput, changeNote?: string): Promise<AdSetRow> {
  const media = await resolveMedia(input.media)
  const thumb = await thumbnailFromMedia(media)
  const copies = copyRows(input.copies)

  const asset = await prisma.asset.create({
    data: {
      type: "SOCIAL_AD",
      title: input.title,
      description: input.description ?? null,
      visibility: input.visibility,
      brand: input.brand ?? null,
      adPlatform: input.adPlatform,
      thumbnailUrl: thumb.thumbnailUrl,
      blurDataUrl: thumb.blurDataUrl,
      availableLanguages: copyLanguages(copies),
      region: [],
      persona: [],
      publishedAt: input.publish ? new Date() : null,
      media: { create: media },
      adCopies: { create: copies },
    },
    include: adSetInclude,
  })
  await createChangelog("created", "asset", asset.id, asset.title, changeNote)
  return asset
}

export async function updateAdSet(id: string, input: UpdateAdSetInput, changeNote?: string): Promise<AdSetRow> {
  const existing = await prisma.asset.findFirst({ where: { id, type: "SOCIAL_AD" }, include: adSetInclude })
  if (!existing) throw new AdSetInputError("NOT_FOUND")

  const data: Prisma.AssetUpdateInput = {}
  if (input.title !== undefined) data.title = input.title
  if (input.description !== undefined) data.description = input.description
  if (input.visibility !== undefined) data.visibility = input.visibility
  if (input.brand !== undefined) data.brand = input.brand
  if (input.adPlatform !== undefined) data.adPlatform = input.adPlatform
  if (input.publish !== undefined) {
    // Keep the original publish date when re-publishing a live ad set.
    data.publishedAt = input.publish ? existing.publishedAt ?? new Date() : null
  }

  const media = input.media ? await resolveMedia(input.media) : null
  if (media) {
    const coverChanged = media[0]?.fileUrl !== existing.media[0]?.fileUrl || !existing.thumbnailUrl
    if (coverChanged) {
      const thumb = await thumbnailFromMedia(media)
      data.thumbnailUrl = thumb.thumbnailUrl
      data.blurDataUrl = thumb.blurDataUrl
    }
  }
  const copies = input.copies ? copyRows(input.copies) : null
  if (copies) data.availableLanguages = copyLanguages(copies)

  const asset = await prisma.$transaction(async (tx) => {
    if (media) {
      await tx.assetMedia.deleteMany({ where: { assetId: id } })
      await tx.assetMedia.createMany({ data: media.map((m) => ({ ...m, assetId: id })) })
    }
    if (copies) {
      await tx.adCopy.deleteMany({ where: { assetId: id } })
      if (copies.length) await tx.adCopy.createMany({ data: copies.map((c) => ({ ...c, assetId: id })) })
    }
    return tx.asset.update({ where: { id }, data, include: adSetInclude })
  })
  await createChangelog("updated", "asset", asset.id, asset.title, changeNote)
  return asset
}

/** Ad sets the viewer may see, newest first. Drafts only when asked (admins). */
export async function findAdSets(
  viewer: Viewer,
  opts: { includeDrafts?: boolean; brand?: string | null; take?: number; skip?: number; id?: string } = {}
) {
  const where: Prisma.AssetWhereInput = {
    type: "SOCIAL_AD",
    ...(opts.id ? { id: opts.id } : {}),
    ...(opts.includeDrafts ? {} : { publishedAt: { not: null } }),
    ...assetAccessWhere(viewer),
    // brand=COLECT / LE_NEW_BLACK also matches BOTH (employees only).
    ...(viewer.isEmployee && opts.brand
      ? { brand: opts.brand === "BOTH" ? "BOTH" : { in: [opts.brand as "COLECT" | "LE_NEW_BLACK", "BOTH"] } }
      : {}),
  }
  const [rows, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: adSetInclude,
      orderBy: [{ publishedAt: { sort: "desc", nulls: "first" } }, { updatedAt: "desc" }],
      take: opts.take,
      skip: opts.skip,
    }),
    prisma.asset.count({ where }),
  ])
  return { rows, total }
}

/** Response shape shared by the portal, admin and v1 API. */
export async function serializeAdSets(rows: AdSetRow[], viewer: Viewer) {
  // One batched presign for every visual (cached per key in s3.ts).
  const allMedia = rows.flatMap((r) => r.media)
  const urls = await getPresignedUrls([...allMedia.map((m) => m.fileUrl), ...rows.map((r) => r.thumbnailUrl)])
  const mediaUrl = new Map(allMedia.map((m, i) => [m.id, urls[i]]))
  const thumbUrl = new Map(rows.map((r, i) => [r.id, urls[allMedia.length + i]]))

  return rows.map((r) => ({
    id: r.id,
    type: "SOCIAL_AD" as const,
    title: r.title,
    description: r.description,
    adPlatform: r.adPlatform,
    thumbnailUrl: thumbUrl.get(r.id) ?? mediaUrl.get(r.media[0]?.id ?? "") ?? null,
    blurDataUrl: r.blurDataUrl,
    availableLanguages: r.availableLanguages,
    published: r.publishedAt !== null,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    ...internalAssetFields(viewer, r),
    media: r.media.map((m) => ({
      id: m.id,
      url: mediaUrl.get(m.id) ?? null,
      // Raw storage URL (no signature) — what write endpoints accept back.
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileType: m.fileType,
      fileSize: m.fileSize,
    })),
    copies: r.adCopies.map((c) => ({
      id: c.id,
      language: c.language,
      label: c.label,
      introText: c.introText,
      headline: c.headline,
      description: c.description,
      ctaLabel: c.ctaLabel,
      destinationUrl: c.destinationUrl,
    })),
  }))
}

export type SerializedAdSet = Awaited<ReturnType<typeof serializeAdSets>>[number]
