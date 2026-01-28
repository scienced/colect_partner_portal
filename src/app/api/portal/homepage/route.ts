import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/supertokens/session"
import { prisma } from "@/lib/prisma"
import { getPresignedUrls } from "@/lib/s3"

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
          asset: {
            select: {
              id: true, type: true, title: true, description: true,
              fileUrl: true, thumbnailUrl: true, blurDataUrl: true, externalLink: true,
              language: true, persona: true, campaignGoal: true,
              campaignLink: true, sentAt: true,
              createdAt: true, updatedAt: true,
            },
          },
          docsUpdate: true,
          productUpdate: true,
        },
      }),
      prisma.asset.findMany({
        where: { type: "DECK", publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 10,
        select: {
          id: true, type: true, title: true, description: true,
          fileUrl: true, thumbnailUrl: true, blurDataUrl: true, externalLink: true,
          language: true, persona: true, campaignGoal: true, sentAt: true,
          createdAt: true, updatedAt: true, publishedAt: true,
          isPinned: true, pinnedAt: true, pinExpiresAt: true, pinOrder: true,
        },
      }),
      prisma.asset.findMany({
        where: { type: "VIDEO", publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 10,
        select: {
          id: true, type: true, title: true, description: true,
          fileUrl: true, thumbnailUrl: true, blurDataUrl: true, externalLink: true,
          language: true, persona: true, campaignGoal: true, sentAt: true,
          createdAt: true, updatedAt: true, publishedAt: true,
          isPinned: true, pinnedAt: true, pinExpiresAt: true, pinOrder: true,
        },
      }),
      prisma.asset.findMany({
        where: { type: "CAMPAIGN", publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 10,
        select: {
          id: true, type: true, title: true, description: true,
          fileUrl: true, thumbnailUrl: true, blurDataUrl: true, externalLink: true,
          language: true, persona: true, campaignGoal: true, sentAt: true,
          createdAt: true, updatedAt: true, publishedAt: true,
          isPinned: true, pinnedAt: true, pinExpiresAt: true, pinOrder: true,
        },
      }),
      prisma.asset.findMany({
        where: { type: "ASSET", publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 10,
        select: {
          id: true, type: true, title: true, description: true,
          fileUrl: true, thumbnailUrl: true, blurDataUrl: true, externalLink: true,
          language: true, persona: true, campaignGoal: true, sentAt: true,
          createdAt: true, updatedAt: true, publishedAt: true,
          isPinned: true, pinnedAt: true, pinExpiresAt: true, pinOrder: true,
        },
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
        select: {
          id: true, type: true, title: true, description: true,
          fileUrl: true, thumbnailUrl: true, blurDataUrl: true, externalLink: true,
          language: true, persona: true, campaignGoal: true, sentAt: true,
          createdAt: true, updatedAt: true, publishedAt: true,
          isPinned: true, pinnedAt: true, pinExpiresAt: true, pinOrder: true,
        },
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

    // Batch presign all S3 URLs at once (instead of per-item calls)
    const allItems = [...processedDecks, ...processedVideos, ...processedCampaigns, ...processedAssets, ...recentlyUpdated]
    const allThumbnailUrls = allItems.map(a => a.thumbnailUrl)
    const allFileUrls = allItems.map(a => a.fileUrl)
    const [presignedThumbnails, presignedFiles] = await Promise.all([
      getPresignedUrls(allThumbnailUrls),
      getPresignedUrls(allFileUrls),
    ])

    // Split presigned URLs back to their respective arrays
    let offset = 0
    const decks = processedDecks.map((a, i) => ({
      ...a,
      thumbnailUrl: presignedThumbnails[offset + i],
      fileUrl: presignedFiles[offset + i],
    }))
    offset += processedDecks.length
    const videos = processedVideos.map((a, i) => ({
      ...a,
      thumbnailUrl: presignedThumbnails[offset + i] ?? getYouTubeThumbnail(a.externalLink),
      fileUrl: presignedFiles[offset + i],
    }))
    offset += processedVideos.length
    const campaigns = processedCampaigns.map((a, i) => ({
      ...a,
      thumbnailUrl: presignedThumbnails[offset + i],
      fileUrl: presignedFiles[offset + i],
    }))
    offset += processedCampaigns.length
    const assets = processedAssets.map((a, i) => ({
      ...a,
      thumbnailUrl: presignedThumbnails[offset + i],
      fileUrl: presignedFiles[offset + i],
    }))
    offset += processedAssets.length
    const recent = recentlyUpdated.map((item, i) => ({
      ...item,
      thumbnailUrl: presignedThumbnails[offset + i]
        ?? (item._type === "asset" && (item as any).type === "VIDEO"
            ? getYouTubeThumbnail((item as any).externalLink)
            : null),
      fileUrl: presignedFiles[offset + i],
    }))

    // Batch presign featured content URLs
    const featuredThumbnailUrls = featuredContent.map(item => item.asset?.thumbnailUrl ?? null)
    const featuredFileUrls = featuredContent.map(item => item.asset?.fileUrl ?? null)
    const [featuredPresignedThumbs, featuredPresignedFiles] = await Promise.all([
      getPresignedUrls(featuredThumbnailUrls),
      getPresignedUrls(featuredFileUrls),
    ])

    const featured = featuredContent.map((item, i) => {
      const asset = item.asset
      const docsUpdate = item.docsUpdate

      if (asset) {
        const thumbnailUrl = featuredPresignedThumbs[i]
          ?? (asset.type === "VIDEO" ? getYouTubeThumbnail(asset.externalLink) : null)
        const fileUrl = featuredPresignedFiles[i]

        return {
          id: item.id,
          title: item.title || asset.title,
          description: item.description || asset.description,
          thumbnailUrl,
          href: getAssetHref(asset, fileUrl),
          external: shouldOpenExternal(asset),
          category: asset.type.toLowerCase(),
          asset: {
            id: asset.id,
            type: asset.type,
            title: asset.title,
            description: asset.description,
            thumbnailUrl,
            blurDataUrl: asset.blurDataUrl,
            fileUrl,
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
    })

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
function getAssetHref(asset: { type: string; fileUrl: string | null; externalLink: string | null; campaignLink: string | null }, presignedFileUrl: string | null): string {
  switch (asset.type) {
    case "DECK":
      return presignedFileUrl || "/decks"
    case "VIDEO":
      return asset.externalLink || presignedFileUrl || "/videos"
    case "CAMPAIGN":
      return presignedFileUrl || asset.externalLink || asset.campaignLink || "/campaigns"
    case "ASSET":
      return asset.externalLink || presignedFileUrl || "/assets"
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
      return !!(asset.fileUrl || asset.externalLink || asset.campaignLink)
    case "ASSET":
      return !!(asset.externalLink || asset.fileUrl)
    default:
      return false
  }
}
