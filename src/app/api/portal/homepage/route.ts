import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/supertokens/session"
import { prisma } from "@/lib/prisma"
import { getPresignedUrlIfNeeded } from "@/lib/s3"

// Helper to generate YouTube thumbnail from URL
function getYouTubeThumbnail(url: string | null): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
    }
  }
  return null
}

// Helper to check if pin is still active
function isPinActive(item: { isPinned: boolean; pinExpiresAt: Date | null }): boolean {
  if (!item.isPinned) return false
  if (!item.pinExpiresAt) return true
  return new Date(item.pinExpiresAt) > new Date()
}

// Helper to process assets with pin status
function processAssetPins<T extends { isPinned: boolean; pinExpiresAt: Date | null; pinOrder: number; publishedAt: Date | null }>(
  assets: T[]
): T[] {
  return assets
    .map((a) => ({ ...a, isPinned: isPinActive(a) }))
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      if (a.isPinned && b.isPinned && a.pinOrder !== b.pinOrder) {
        return b.pinOrder - a.pinOrder
      }
      const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return bDate - aDate
    })
}

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all data in parallel
    const [
      featuredContent,
      latestDecks,
      latestVideos,
      latestCampaigns,
      latestAssets,
      docsUpdates,
      recentAssets,
      recentDocs,
    ] = await Promise.all([
      prisma.featuredContent.findMany({
        where: {
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
        orderBy: { displayOrder: "asc" },
        take: 5,
        include: {
          asset: true,
          docsUpdate: true,
          productUpdate: true,
        },
      }),
      prisma.asset.findMany({
        where: { type: "DECK", publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 10,
      }),
      prisma.asset.findMany({
        where: { type: "VIDEO", publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 10,
      }),
      prisma.asset.findMany({
        where: { type: "CAMPAIGN", publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 10,
      }),
      prisma.asset.findMany({
        where: { type: "ASSET", publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 10,
      }),
      prisma.docsUpdate.findMany({
        where: { publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 8,
      }),
      prisma.asset.findMany({
        where: { publishedAt: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.docsUpdate.findMany({
        where: { publishedAt: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ])

    // Merge and sort recently updated items (assets + docs)
    const recentlyUpdated = [
      ...recentAssets.map(a => ({ ...a, _type: "asset" as const })),
      ...recentDocs.map(d => ({
        id: d.id,
        type: "DOCS" as const,
        title: d.title,
        description: d.summary,
        thumbnailUrl: null,
        fileUrl: null,
        externalLink: d.deepLink,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        _type: "docs" as const,
      })),
    ]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)

    // Process pins (filter expired, re-sort)
    const processedDecks = processAssetPins(latestDecks)
    const processedVideos = processAssetPins(latestVideos)
    const processedCampaigns = processAssetPins(latestCampaigns)
    const processedAssets = processAssetPins(latestAssets)

    // Generate presigned URLs for all assets (and YouTube thumbnails for videos)
    const [decks, videos, campaigns, assets, recent] = await Promise.all([
      Promise.all(processedDecks.map(async (a) => ({
        ...a,
        thumbnailUrl: await getPresignedUrlIfNeeded(a.thumbnailUrl),
        fileUrl: await getPresignedUrlIfNeeded(a.fileUrl),
      }))),
      Promise.all(processedVideos.map(async (a) => ({
        ...a,
        thumbnailUrl: a.thumbnailUrl
          ? await getPresignedUrlIfNeeded(a.thumbnailUrl)
          : getYouTubeThumbnail(a.externalLink),
        fileUrl: await getPresignedUrlIfNeeded(a.fileUrl),
      }))),
      Promise.all(processedCampaigns.map(async (a) => ({
        ...a,
        thumbnailUrl: await getPresignedUrlIfNeeded(a.thumbnailUrl),
        fileUrl: await getPresignedUrlIfNeeded(a.fileUrl),
      }))),
      Promise.all(processedAssets.map(async (a) => ({
        ...a,
        thumbnailUrl: await getPresignedUrlIfNeeded(a.thumbnailUrl),
        fileUrl: await getPresignedUrlIfNeeded(a.fileUrl),
      }))),
      Promise.all(recentlyUpdated.map(async (item) => ({
        ...item,
        thumbnailUrl: item.thumbnailUrl
          ? await getPresignedUrlIfNeeded(item.thumbnailUrl)
          : (item._type === "asset" && (item as any).type === "VIDEO"
              ? getYouTubeThumbnail((item as any).externalLink)
              : null),
        fileUrl: item.fileUrl ? await getPresignedUrlIfNeeded(item.fileUrl) : null,
      }))),
    ])

    // Process featured content
    const featured = await Promise.all(featuredContent.map(async (item) => {
      const asset = item.asset
      const docsUpdate = item.docsUpdate

      if (asset) {
        // For videos without a thumbnail, generate YouTube thumbnail from external link
        const thumbnailUrl = asset.thumbnailUrl
          ? await getPresignedUrlIfNeeded(asset.thumbnailUrl)
          : (asset.type === "VIDEO" ? getYouTubeThumbnail(asset.externalLink) : null)

        return {
          id: item.id,
          title: item.title || asset.title,
          description: item.description || asset.description,
          thumbnailUrl,
          href: await getAssetHref(asset),
          external: shouldOpenExternal(asset),
          category: asset.type.toLowerCase(),
          // Include full asset data for drawer
          asset: {
            id: asset.id,
            type: asset.type,
            title: asset.title,
            description: asset.description,
            thumbnailUrl,
            fileUrl: await getPresignedUrlIfNeeded(asset.fileUrl),
            externalLink: asset.externalLink,
            language: asset.language,
            persona: asset.persona,
            campaignGoal: asset.campaignGoal,
            sentAt: asset.sentAt,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
          },
        }
      }
      if (docsUpdate) {
        return {
          id: item.id,
          title: item.title || docsUpdate.title,
          description: item.description || docsUpdate.summary,
          href: docsUpdate.deepLink,
          external: true,
          category: "docs",
          // Include docs data for drawer
          asset: {
            id: docsUpdate.id,
            type: "DOCS",
            title: docsUpdate.title,
            description: docsUpdate.summary,
            thumbnailUrl: null,
            fileUrl: null,
            externalLink: docsUpdate.deepLink,
            language: [],
            persona: [],
            campaignGoal: null,
            sentAt: null,
            createdAt: docsUpdate.createdAt,
            updatedAt: docsUpdate.updatedAt,
          },
        }
      }
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        href: "/",
        category: "deck",
        asset: null,
      }
    }))

    return NextResponse.json({
      featured,
      decks,
      videos,
      campaigns,
      assets,
      docsUpdates,
      recentlyUpdated: recent,
    })
  } catch (error) {
    console.error("Homepage data error:", error)
    return NextResponse.json({ error: "Failed to fetch homepage data" }, { status: 500 })
  }
}

// Helper functions
async function getAssetHref(asset: { type: string; fileUrl: string | null; externalLink: string | null; campaignLink: string | null }): Promise<string> {
  switch (asset.type) {
    case "DECK":
      return await getPresignedUrlIfNeeded(asset.fileUrl) || "/decks"
    case "VIDEO":
      return asset.externalLink || await getPresignedUrlIfNeeded(asset.fileUrl) || "/videos"
    case "CAMPAIGN":
      return await getPresignedUrlIfNeeded(asset.fileUrl) || asset.campaignLink || "/campaigns"
    case "ASSET":
      return asset.externalLink || await getPresignedUrlIfNeeded(asset.fileUrl) || "/assets"
    default:
      return "/"
  }
}

function shouldOpenExternal(asset: { type: string; fileUrl: string | null; externalLink: string | null; campaignLink: string | null }): boolean {
  switch (asset.type) {
    case "DECK":
      return !!asset.fileUrl
    case "VIDEO":
      return !!(asset.externalLink || asset.fileUrl)
    case "CAMPAIGN":
      return !!(asset.fileUrl || asset.campaignLink)
    case "ASSET":
      return !!(asset.externalLink || asset.fileUrl)
    default:
      return false
  }
}
