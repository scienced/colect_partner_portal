import { prisma } from "@/lib/prisma"
import { createChangelog } from "@/lib/changelog"
import { z } from "zod"
import type { AssetType } from "@prisma/client"
import {
  canonicalLanguage,
  legacyColumnsFromVariants,
  projectAvailableLanguages,
  SUPPORTED_LANGUAGES,
} from "@/lib/assetVariants"

/**
 * Asset create/update — shared by the admin dashboard routes (/api/assets)
 * and the agent API (/api/v1/assets). Both write paths go through here so
 * pin limits, variant handling and the legacy dual-write stay identical.
 */

export const MAX_PINNED_PER_TYPE = 3

/** A validation/business-rule failure the caller should return as a 4xx. */
export class AssetWriteError extends Error {
  constructor(public status: 400 | 404, message: string) {
    super(message)
  }
}

export const VariantInputSchema = z.object({
  id: z.string().optional(),
  language: z.enum(SUPPORTED_LANGUAGES).transform(canonicalLanguage),
  fileUrl: z.string().nullable().optional(),
  fileType: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  externalLink: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
})

export const VisibilitySchema = z.enum(["EVERYONE", "EMPLOYEES"])
export const BrandSchema = z.enum(["COLECT", "LE_NEW_BLACK", "BOTH"])

// Reject duplicate languages — the DB has @@unique([assetId, language]) and
// we want a clear validation error instead of a Prisma unique-constraint 500.
const uniqueLanguages = (v: { language: string }[] | undefined) =>
  !v || new Set(v.map((x) => x.language)).size === v.length
const uniqueLanguagesMessage = { message: "Each language can only appear once per asset" }

export const CreateAssetSchema = z.object({
  type: z.enum(["DECK", "CAMPAIGN", "ASSET", "VIDEO"]),
  title: z.string().min(1),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  blurDataUrl: z.string().optional(),
  region: z.array(z.string()).default([]),
  // Variants are the source of truth for files, links, and language availability.
  variants: z.array(VariantInputSchema).default([]).refine(uniqueLanguages, uniqueLanguagesMessage),
  persona: z.array(z.string()).default([]),
  visibility: VisibilitySchema.default("EVERYONE"),
  brand: BrandSchema.nullable().optional(),
  campaignGoal: z.string().optional(),
  campaignLink: z.string().optional(),
  templateContent: z.string().optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  sentAt: z.string().datetime().optional().nullable(),
  isPinned: z.boolean().optional().default(false),
  pinnedAt: z.string().datetime().optional().nullable(),
  pinExpiresAt: z.string().datetime().optional().nullable(),
  pinOrder: z.number().optional().default(0),
})

export const UpdateAssetSchema = z.object({
  type: z.enum(["DECK", "CAMPAIGN", "ASSET", "VIDEO"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  blurDataUrl: z.string().optional().nullable(),
  region: z.array(z.string()).optional(),
  persona: z.array(z.string()).optional(),
  visibility: VisibilitySchema.optional(),
  brand: BrandSchema.nullable().optional(),
  // Variants: if provided, replaces the full variant set for the asset.
  // Omit to leave variants untouched.
  variants: z.array(VariantInputSchema).optional().refine(uniqueLanguages, uniqueLanguagesMessage),
  campaignGoal: z.string().optional().nullable(),
  campaignLink: z.string().optional().nullable(),
  templateContent: z.string().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
  sentAt: z.string().datetime().optional().nullable(),
  isPinned: z.boolean().optional(),
  pinnedAt: z.string().datetime().optional().nullable(),
  pinExpiresAt: z.string().datetime().optional().nullable(),
  pinOrder: z.number().optional(),
})

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>

async function assertPinCapacity(type: AssetType, excludeId?: string) {
  const pinnedCount = await prisma.asset.count({
    where: {
      type,
      isPinned: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [{ pinExpiresAt: null }, { pinExpiresAt: { gt: new Date() } }],
    },
  })
  if (pinnedCount >= MAX_PINNED_PER_TYPE) {
    throw new AssetWriteError(400, `Maximum of ${MAX_PINNED_PER_TYPE} pinned items per category allowed`)
  }
}

/** `changeNote` lands in the Changelog description (e.g. "via API key …"). */
export async function createAsset(data: CreateAssetInput, changeNote?: string) {
  if (data.isPinned) await assertPinCapacity(data.type)

  const availableLanguages = projectAvailableLanguages(data.variants)
  const legacy = legacyColumnsFromVariants(data.variants)

  const asset = await prisma.asset.create({
    data: {
      type: data.type,
      title: data.title,
      description: data.description,
      thumbnailUrl: data.thumbnailUrl,
      blurDataUrl: data.blurDataUrl,
      region: data.region,
      persona: data.persona,
      visibility: data.visibility,
      brand: data.brand ?? null,
      availableLanguages,
      campaignGoal: data.campaignGoal,
      campaignLink: data.campaignLink,
      templateContent: data.templateContent,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      sentAt: data.sentAt ? new Date(data.sentAt) : null,
      isPinned: data.isPinned,
      pinnedAt: data.isPinned ? new Date() : null,
      pinExpiresAt: data.pinExpiresAt ? new Date(data.pinExpiresAt) : null,
      pinOrder: data.pinOrder,
      // Dual-write legacy columns from the default variant (expand phase).
      fileUrl: legacy.fileUrl,
      fileType: legacy.fileType,
      fileSize: legacy.fileSize,
      externalLink: legacy.externalLink,
      variants: {
        create: data.variants.map((v) => ({
          language: v.language,
          fileUrl: v.fileUrl ?? null,
          fileType: v.fileType ?? null,
          fileSize: v.fileSize ?? null,
          externalLink: v.externalLink ?? null,
          displayOrder: v.displayOrder,
        })),
      },
    },
    include: { variants: true },
  })

  await createChangelog("created", "asset", asset.id, asset.title, changeNote)
  return asset
}

export async function updateAsset(id: string, data: UpdateAssetInput, changeNote?: string) {
  const existing = await prisma.asset.findUnique({
    where: { id },
    include: { variants: true },
  })
  if (!existing) throw new AssetWriteError(404, "Asset not found")
  if (existing.type === "SOCIAL_AD") {
    throw new AssetWriteError(400, "This is an ad set — edit it on the Ads page.")
  }

  // Check max pinned limit if trying to pin (and not already pinned)
  if (data.isPinned && !existing.isPinned) {
    await assertPinCapacity(data.type || existing.type, id)
  }

  // Build the non-variant scalar updates
  const scalarUpdate: Record<string, unknown> = {}
  if (data.type !== undefined) scalarUpdate.type = data.type
  if (data.title !== undefined) scalarUpdate.title = data.title
  if (data.description !== undefined) scalarUpdate.description = data.description
  if (data.thumbnailUrl !== undefined) scalarUpdate.thumbnailUrl = data.thumbnailUrl
  if (data.blurDataUrl !== undefined) scalarUpdate.blurDataUrl = data.blurDataUrl
  if (data.region !== undefined) scalarUpdate.region = data.region
  if (data.persona !== undefined) scalarUpdate.persona = data.persona
  if (data.visibility !== undefined) scalarUpdate.visibility = data.visibility
  if (data.brand !== undefined) scalarUpdate.brand = data.brand
  if (data.campaignGoal !== undefined) scalarUpdate.campaignGoal = data.campaignGoal
  if (data.campaignLink !== undefined) scalarUpdate.campaignLink = data.campaignLink
  if (data.templateContent !== undefined) scalarUpdate.templateContent = data.templateContent
  if (data.isPinned !== undefined) scalarUpdate.isPinned = data.isPinned
  if (data.pinOrder !== undefined) scalarUpdate.pinOrder = data.pinOrder
  if (data.publishedAt !== undefined) {
    scalarUpdate.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null
  }
  if (data.sentAt !== undefined) {
    scalarUpdate.sentAt = data.sentAt ? new Date(data.sentAt) : null
  }
  if (data.pinExpiresAt !== undefined) {
    scalarUpdate.pinExpiresAt = data.pinExpiresAt ? new Date(data.pinExpiresAt) : null
  }
  if (data.isPinned !== undefined) {
    scalarUpdate.pinnedAt =
      data.isPinned && !existing.isPinned ? new Date() : data.isPinned === false ? null : undefined
  }

  // Transaction: replace variants (if supplied), recompute availableLanguages,
  // dual-write legacy columns from the new default variant.
  const asset = await prisma.$transaction(async (tx) => {
    if (data.variants !== undefined) {
      // Delete the existing set and recreate. Simpler and correct for the
      // "full variant array" shape. Row count is small (max ~4 languages per
      // asset) so the perf cost is negligible.
      await tx.assetVariant.deleteMany({ where: { assetId: id } })
      if (data.variants.length > 0) {
        await tx.assetVariant.createMany({
          data: data.variants.map((v) => ({
            assetId: id,
            language: v.language,
            fileUrl: v.fileUrl ?? null,
            fileType: v.fileType ?? null,
            fileSize: v.fileSize ?? null,
            externalLink: v.externalLink ?? null,
            displayOrder: v.displayOrder,
          })),
        })
      }

      // Recompute denormalised fields + legacy dual-write from the new set.
      scalarUpdate.availableLanguages = projectAvailableLanguages(data.variants)
      const legacy = legacyColumnsFromVariants(data.variants)
      scalarUpdate.fileUrl = legacy.fileUrl
      scalarUpdate.fileType = legacy.fileType
      scalarUpdate.fileSize = legacy.fileSize
      scalarUpdate.externalLink = legacy.externalLink
    }

    return tx.asset.update({
      where: { id },
      data: scalarUpdate,
      include: { variants: true },
    })
  })

  await createChangelog("updated", "asset", asset.id, asset.title, changeNote)
  return asset
}
