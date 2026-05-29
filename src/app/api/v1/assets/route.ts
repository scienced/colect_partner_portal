import { NextRequest } from "next/server"
import { requireApiKey, isAuthResponse } from "@/lib/v1Auth"
import { ok, httpErrors, withV1Handler } from "@/lib/v1Response"
import { prisma } from "@/lib/prisma"
import { AssetType, Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"

const ASSET_TYPES = Object.values(AssetType)

export const GET = withV1Handler(async (request: NextRequest) => {
  const auth = await requireApiKey(request)
  if (isAuthResponse(auth)) return auth

  const { searchParams } = new URL(request.url)

  const typeParam = searchParams.get("type")?.toUpperCase()
  if (typeParam && !ASSET_TYPES.includes(typeParam as AssetType)) {
    return httpErrors.badRequest(
      `Unknown asset type "${typeParam}". Allowed: ${ASSET_TYPES.join(", ")}.`
    )
  }

  const region = searchParams.get("region")?.trim() || undefined
  const persona = searchParams.get("persona")?.trim() || undefined
  const language = searchParams.get("language")?.trim() || undefined
  const limit = clampInt(searchParams.get("limit"), 1, 100, 50)
  const offset = clampInt(searchParams.get("offset"), 0, 100_000, 0)

  const where: Prisma.AssetWhereInput = {
    publishedAt: { not: null },
    ...(typeParam ? { type: typeParam as AssetType } : {}),
    ...(region ? { region: { has: region } } : {}),
    ...(persona ? { persona: { has: persona } } : {}),
    ...(language ? { availableLanguages: { has: language.toUpperCase() } } : {}),
  }

  const origin = new URL(request.url).origin

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      skip: offset,
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        region: true,
        persona: true,
        availableLanguages: true,
        campaignGoal: true,
        campaignLink: true,
        sentAt: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
        variants: {
          select: { language: true, fileType: true, fileSize: true, externalLink: true },
          orderBy: [{ displayOrder: "asc" }, { language: "asc" }],
        },
      },
    }),
    prisma.asset.count({ where }),
  ])

  return ok({
    items: items.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      thumbnailUrl: a.thumbnailUrl,
      region: a.region,
      persona: a.persona,
      availableLanguages: a.availableLanguages,
      campaignGoal: a.campaignGoal,
      campaignLink: a.campaignLink,
      sentAt: a.sentAt?.toISOString() ?? null,
      isPinned: a.isPinned,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      publishedAt: a.publishedAt?.toISOString() ?? null,
      variants: a.variants,
      portalUrl: portalUrlFor(origin, a.type),
      detailUrl: `${origin}/api/v1/assets/${a.id}`,
    })),
    total,
    limit,
    offset,
  })
})

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function portalUrlFor(origin: string, type: AssetType): string {
  switch (type) {
    case "DECK": return `${origin}/decks`
    case "CAMPAIGN": return `${origin}/campaigns`
    case "VIDEO": return `${origin}/videos`
    default: return `${origin}/assets`
  }
}
