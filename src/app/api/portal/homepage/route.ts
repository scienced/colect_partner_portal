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
        fileUrl: await getPresignedUrlIfNeeded(a.fileUrl),
      }))),
      Promise.all(latestAssets.map(async (a) => ({
        ...a,
        thumbnailUrl: await getPresignedUrlIfNeeded(a.thumbnailUrl),
        fileUrl: await getPresignedUrlIfNeeded(a.fileUrl),
      }))),
      Promise.all(recentlyUpdated.map(async (item) => ({
        ...item,
        thumbnailUrl: item.thumbnailUrl ? await getPresignedUrlIfNeeded(item.thumbnailUrl) : null,
        fileUrl: item.fileUrl ? await getPresignedUrlIfNeeded(item.fileUrl) : null,
      }))),
    ])

    // Process featured content
    const featured = await Promise.all(featuredContent.map(async (item) => {
      const asset = item.asset
      const docsUpdate = item.docsUpdate

      if (asset) {
        return {
          id: item.id,
          title: item.title || asset.title,
          description: item.description || asset.description,
          thumbnailUrl: await getPresignedUrlIfNeeded(asset.thumbnailUrl),
          href: await getAssetHref(asset),
          external: shouldOpenExternal(asset),
          category: asset.type.toLowerCase(),
          // Include full asset data for drawer
          asset: {
            id: asset.id,
            type: asset.type,
            title: asset.title,
            description: asset.description,
            thumbnailUrl: await getPresignedUrlIfNeeded(asset.thumbnailUrl),
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
