import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireSession } from "@/lib/supertokens/session"
import { createChangelog } from "@/lib/changelog"
import { z } from "zod"
import {
  canonicalLanguage,
  legacyColumnsFromVariants,
  projectAvailableLanguages,
  SUPPORTED_LANGUAGES,
} from "@/lib/assetVariants"

const MAX_PINNED_PER_TYPE = 3

const VariantInputSchema = z.object({
  id: z.string().optional(),
  language: z.enum(SUPPORTED_LANGUAGES).transform(canonicalLanguage),
  fileUrl: z.string().nullable().optional(),
  fileType: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  externalLink: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
})

const UpdateAssetSchema = z.object({
  type: z.enum(["DECK", "CAMPAIGN", "ASSET", "VIDEO"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  blurDataUrl: z.string().optional().nullable(),
  region: z.array(z.string()).optional(),
  persona: z.array(z.string()).optional(),
  // Variants: if provided, replaces the full variant set for the asset.
  // Omit to leave variants untouched. Reject duplicates — the DB has
  // @@unique([assetId, language]) and we want a 400, not a 500.
  variants: z
    .array(VariantInputSchema)
    .optional()
    .refine(
      (v) => !v || new Set(v.map((x) => x.language)).size === v.length,
      { message: "Each language can only appear once per asset" }
    ),
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

// GET: Get single asset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession()

    const { id } = await params
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { variants: true },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error("Error fetching asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT: Update asset (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const body = await request.json()
    const data = UpdateAssetSchema.parse(body)

    const existing = await prisma.asset.findUnique({
      where: { id },
      include: { variants: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Check max pinned limit if trying to pin (and not already pinned)
    const assetType = data.type || existing.type
    if (data.isPinned && !existing.isPinned) {
      const pinnedCount = await prisma.asset.count({
        where: {
          type: assetType,
          isPinned: true,
          id: { not: id }, // Exclude current asset
          OR: [
            { pinExpiresAt: null },
            { pinExpiresAt: { gt: new Date() } },
          ],
        },
      })

      if (pinnedCount >= MAX_PINNED_PER_TYPE) {
        return NextResponse.json(
          { error: `Maximum of ${MAX_PINNED_PER_TYPE} pinned items per category allowed` },
          { status: 400 }
        )
      }
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
        // admin form's "full variant array" PUT shape. Row count is small
        // (max ~4 languages per asset) so the perf cost is negligible.
        await tx.assetVariant.deleteMany({ where: { assetId: id } })
        if (data.variants.length > 0) {
          await tx.assetVariant.createMany({
            data: data.variants.map(v => ({
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

    await createChangelog("updated", "asset", asset.id, asset.title)

    return NextResponse.json(asset)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE: Delete asset (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const existing = await prisma.asset.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Variants cascade via onDelete: Cascade on AssetVariant.asset.
    await prisma.asset.delete({
      where: { id },
    })

    await createChangelog("deleted", "asset", id, existing.title)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
