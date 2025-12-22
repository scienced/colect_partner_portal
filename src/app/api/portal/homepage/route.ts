import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/supertokens/session"
import { prisma } from "@/lib/prisma"
import { getPresignedUrlIfNeeded } from "@/lib/s3"

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
      recentlyUpdated,
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
        orderBy: { publishedAt: "desc" },
        take: 10,
      }),
      prisma.asset.findMany({
        where: { type: "VIDEO", publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: 10,
      }),
      prisma.asset.findMany({
        where: { type: "CAMPAIGN", publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: 10,
      }),
      prisma.asset.findMany({
        where: { type: "ASSET", publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: 10,
      }),
      prisma.docsUpdate.findMany({
        where: { publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: 8,
      }),
      prisma.asset.findMany({
        where: { publishedAt: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ])

    // Generate presigned URLs for all assets
    const [decks, videos, campaigns, assets, recent] = await Promise.all([
      Promise.all(latestDecks.map(async (a) => ({
        ...a,
        thumbnailUrl: await getPresignedUrlIfNeeded(a.thumbnailUrl),
        fileUrl: await getPresignedUrlIfNeeded(a.fileUrl),
      }))),
      Promise.all(latestVideos.map(async (a) => ({
        ...a,
        thumbnailUrl: await getPresignedUrlIfNeeded(a.thumbnailUrl),
        fileUrl: await getPresignedUrlIfNeeded(a.fileUrl),
      }))),
      Promise.all(latestCampaigns.map(async (a) => ({
        ...a,
        thumbnailUrl: await getPresignedUrlIfNeeded(a.thumbnailUrl),
      }))),
      Promise.all(latestAssets.map(async (a) => ({
        ...a,
        thumbnailUrl: await getPresignedUrlIfNeeded(a.thumbnailUrl),
        fileUrl: await getPresignedUrlIfNeeded(a.fileUrl),
      }))),
      Promise.all(recentlyUpdated.map(async (a) => ({
        ...a,
        thumbnailUrl: await getPresignedUrlIfNeeded(a.thumbnailUrl),
        fileUrl: await getPresignedUrlIfNeeded(a.fileUrl),
      }))),
    ])

    // Process featured content
    const featured = await Promise.all(featuredContent.map(async (item) => {
      const asset = item.asset
      const docsUpdate = item.docsUpdate

      if (asset) {
        return {
          id: item.id,
          title: asset.title,
          description: asset.description || item.description,
          thumbnailUrl: await getPresignedUrlIfNeeded(asset.thumbnailUrl),
          href: await getAssetHref(asset),
          external: shouldOpenExternal(asset),
          category: asset.type.toLowerCase(),
        }
      }
      if (docsUpdate) {
        return {
          id: item.id,
          title: docsUpdate.title,
          description: docsUpdate.summary || item.description,
          href: docsUpdate.deepLink,
          external: true,
          category: "docs",
        }
      }
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        href: "/",
        category: "deck",
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
      return asset.campaignLink || "/campaigns"
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
      return !!asset.campaignLink
    case "ASSET":
      return !!(asset.externalLink || asset.fileUrl)
    default:
      return false
  }
}
