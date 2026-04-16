import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireSession } from "@/lib/supertokens/session"
import { createChangelog } from "@/lib/changelog"
import { AssetType } from "@prisma/client"
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

const AssetSchema = z.object({
  type: z.enum(["DECK", "CAMPAIGN", "ASSET", "VIDEO"]),
  title: z.string().min(1),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  blurDataUrl: z.string().optional(),
  region: z.array(z.string()).default([]),
  // Variants are the source of truth for files, links, and language availability.
  // Reject duplicate languages — the DB has @@unique([assetId, language]) and
  // we want a clear validation error instead of a Prisma unique-constraint 500.
  variants: z
    .array(VariantInputSchema)
    .default([])
    .refine(
      (v) => new Set(v.map((x) => x.language)).size === v.length,
      { message: "Each language can only appear once per asset" }
    ),
  persona: z.array(z.string()).default([]),
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

// GET: List assets (with search and filters)
export async function GET(request: NextRequest) {
  try {
    await requireSession()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const type = searchParams.get("type")
    const region = searchParams.get("region")
    const language = searchParams.get("language")
    // Enforce pagination limits to prevent DoS
    const MAX_LIMIT = 100
    const rawLimit = parseInt(searchParams.get("limit") || "50")
    const rawOffset = parseInt(searchParams.get("offset") || "0")
    const limit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
    const offset = Math.max(rawOffset, 0)

    const where: Record<string, unknown> = {}

    if (type) where.type = type as AssetType
    if (region) where.region = { has: region }
    if (language) where.availableLanguages = { has: canonicalLanguage(language) }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
        include: { variants: true },
      }),
      prisma.asset.count({ where }),
    ])

    return NextResponse.json({ assets, total })
  } catch (error) {
    console.error("Error fetching assets:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST: Create asset (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const data = AssetSchema.parse(body)

    // Check max pinned limit if trying to pin
    if (data.isPinned) {
      const pinnedCount = await prisma.asset.count({
        where: {
          type: data.type,
          isPinned: true,
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
        // Nested create of variants
        variants: {
          create: data.variants.map(v => ({
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

    await createChangelog("created", "asset", asset.id, asset.title)

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
