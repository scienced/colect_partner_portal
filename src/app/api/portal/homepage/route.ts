import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/supertokens/session"
import { prisma } from "@/lib/prisma"
import { getPresignedUrls } from "@/lib/s3"
import { defaultVariant } from "@/lib/assetVariants"

// Shared variant shape re-used in every select below.
const variantSelect = {
  id: true,
  language: true,
  fileUrl: true,
  fileType: true,
  fileSize: true,
  externalLink: true,
  displayOrder: true,
} as const

const variantInclude = {
  select: variantSelect,
  orderBy: [{ displayOrder: "asc" as const }, { language: "asc" as const }],
}

// Shared scalar select for an Asset row shown on the homepage.
const assetSelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  thumbnailUrl: true,
  blurDataUrl: true,
  availableLanguages: true,
  persona: true,
  campaignGoal: true,
  campaignLink: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  isPinned: true,
  pinnedAt: true,
  pinExpiresAt: true,
  pinOrder: true,
  variants: variantInclude,
} as const

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
          asset: { select: assetSelect },
          docsUpdate: true,
          productUpdate: true,
        },
      }),
      prisma.asset.findMany({
        where: { type: "DECK", publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 10,
        select: assetSelect,
      }),
      prisma.asset.findMany({
        where: { type: "VIDEO", publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 10,
        select: assetSelect,
      }),
      prisma.asset.findMany({
        where: { type: "CAMPAIGN", publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 10,
        select: assetSelect,
      }),
      prisma.asset.findMany({
        where: { type: "ASSET", publishedAt: { not: null } },
        orderBy: [{ isPinned: "desc" }, { pinOrder: "desc" }, { publishedAt: "desc" }],
        take: 10,
        select: assetSelect,
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
        select: assetSelect,
      }),
      prisma.docsUpdate.findMany({
        where: { publishedAt: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ])

    // Process pins (filter expired, re-sort) for each type
    const processedDecks = processAssetPins(latestDecks)
    const processedVideos = processAssetPins(latestVideos)
    const processedCampaigns = processAssetPins(latestCampaigns)
    const processedAssets = processAssetPins(latestAssets)

    // Resolve the default variant for every asset in one pass so downstream
    // code can use pre-resolved fileUrl/externalLink. The full `variants`
    // array stays on the asset for the drawer language toggle.
    type AssetRow = typeof processedDecks[number]
    const defaults = (a: AssetRow) => {
      const d = defaultVariant(a.variants)
      return { fileUrl: d?.fileUrl ?? null, externalLink: d?.externalLink ?? null }
    }

    // Build the recently-updated list (assets + docs interleaved by updatedAt)
    const recentAssetsWithDefaults = recentAssets.map((a) => ({
      ...a,
      _type: "asset" as const,
      _defaults: defaults(a),
    }))
    const recentDocsNormalized = recentDocs.map((d) => ({
      id: d.id,
      type: "DOCS" as const,
      title: d.title,
      description: d.summary,
      thumbnailUrl: null,
      externalLink: d.deepLink,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      _type: "docs" as const,
      _defaults: { fileUrl: null as string | null, externalLink: d.deepLink as string | null },
      variants: [] as typeof recentAssets[number]["variants"],
    }))

    type RecentItem =
      | (typeof recentAssetsWithDefaults)[number]
      | (typeof recentDocsNormalized)[number]

    const recentlyUpdatedRaw: RecentItem[] = [
      ...recentAssetsWithDefaults,
      ...recentDocsNormalized,
    ]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)

    // Batch presign: ONLY the default variant's file per asset. Non-default
    // language variants are presigned on-demand via
    // /api/portal/assets/[id]/variant when the drawer toggle is used.
    const allItems: Array<{ thumbnailUrl: string | null; _defaults?: { fileUrl: string | null } } | AssetRow> = [
      ...processedDecks,
      ...processedVideos,
      ...processedCampaigns,
      ...processedAssets,
      ...recentlyUpdatedRaw,
    ]
    const allThumbnailUrls = allItems.map((a) => (a as { thumbnailUrl: string | null }).thumbnailUrl)
    const allFileUrls = allItems.map((a) => {
      if ("_defaults" in a && a._defaults) return a._defaults.fileUrl
      return defaults(a as AssetRow).fileUrl
    })

    const [presignedThumbnails, presignedFiles] = await Promise.all([
      getPresignedUrls(allThumbnailUrls),
      getPresignedUrls(allFileUrls),
    ])

    // Split presigned URLs back to their respective arrays, and expose the
    // pre-resolved default variant's fileUrl/externalLink at the top level
    // so existing card code paths keep working.
    let offset = 0

    const mapAsset = (a: AssetRow, fallbackThumb: string | null, presignedFileUrl: string | null) => {
      const d = defaults(a)
      return {
        ...a,
        thumbnailUrl: fallbackThumb,
        fileUrl: presignedFileUrl,
        externalLink: d.externalLink,
      }
    }

    const decks = processedDecks.map((a, i) =>
      mapAsset(a, presignedThumbnails[offset + i], presignedFiles[offset + i])
    )
    offset += processedDecks.length

    const videos = processedVideos.map((a, i) => {
      const d = defaults(a)
      return {
        ...a,
        thumbnailUrl:
          presignedThumbnails[offset + i] ?? getYouTubeThumbnail(d.externalLink),
        fileUrl: presignedFiles[offset + i],
        externalLink: d.externalLink,
      }
    })
    offset += processedVideos.length

    const campaigns = processedCampaigns.map((a, i) =>
      mapAsset(a, presignedThumbnails[offset + i], presignedFiles[offset + i])
    )
    offset += processedCampaigns.length

    const assets = processedAssets.map((a, i) =>
      mapAsset(a, presignedThumbnails[offset + i], presignedFiles[offset + i])
    )
    offset += processedAssets.length

    const recent = recentlyUpdatedRaw.map((item, i) => {
      const thumb = presignedThumbnails[offset + i]
      const file = presignedFiles[offset + i]
      if (item._type === "asset") {
        const asset = item as (typeof recentAssetsWithDefaults)[number]
        return {
          ...asset,
          thumbnailUrl:
            thumb ??
            (asset.type === "VIDEO"
              ? getYouTubeThumbnail(asset._defaults.externalLink)
              : null),
          fileUrl: file,
          externalLink: asset._defaults.externalLink,
        }
      }
      const doc = item as (typeof recentDocsNormalized)[number]
      return {
        ...doc,
        thumbnailUrl: thumb,
        fileUrl: file,
      }
    })

    // Batch presign featured content's default variant files
    const featuredItems = featuredContent.map((item) => {
      const d = item.asset ? defaults(item.asset) : null
      return { item, d }
    })
    const featuredThumbnailUrls = featuredItems.map(({ item }) => item.asset?.thumbnailUrl ?? null)
    const featuredFileUrls = featuredItems.map(({ d }) => d?.fileUrl ?? null)
    const [featuredPresignedThumbs, featuredPresignedFiles] = await Promise.all([
      getPresignedUrls(featuredThumbnailUrls),
      getPresignedUrls(featuredFileUrls),
    ])

    const featured = featuredItems.map(({ item, d }, i) => {
      const asset = item.asset
      const docsUpdate = item.docsUpdate

      if (asset && d) {
        const thumbnailUrl =
          featuredPresignedThumbs[i] ??
          (asset.type === "VIDEO" ? getYouTubeThumbnail(d.externalLink) : null)
        const fileUrl = featuredPresignedFiles[i]
        const externalLink = d.externalLink

        return {
          id: item.id,
          title: item.title || asset.title,
          description: item.description || asset.description,
          thumbnailUrl,
          href: getAssetHref(asset.type, fileUrl, externalLink, asset.campaignLink),
          external: shouldOpenExternal(asset.type, fileUrl, externalLink, asset.campaignLink),
          category: asset.type.toLowerCase(),
          asset: {
            id: asset.id,
            type: asset.type,
            title: asset.title,
            description: asset.description,
            thumbnailUrl,
            blurDataUrl: asset.blurDataUrl,
            fileUrl,
            externalLink,
            variants: asset.variants,
            availableLanguages: asset.availableLanguages,
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
            variants: [],
            availableLanguages: [],
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

// Helper functions — take pre-resolved default variant fields so the caller
// has a single source of truth for which language is being rendered.
function getAssetHref(
  type: string,
  presignedFileUrl: string | null,
  externalLink: string | null,
  campaignLink: string | null
): string {
  switch (type) {
    case "DECK":
      return presignedFileUrl || "/decks"
    case "VIDEO":
      return externalLink || presignedFileUrl || "/videos"
    case "CAMPAIGN":
      return presignedFileUrl || externalLink || campaignLink || "/campaigns"
    case "ASSET":
      return externalLink || presignedFileUrl || "/assets"
    default:
      return "/"
  }
}

function shouldOpenExternal(
  type: string,
  presignedFileUrl: string | null,
  externalLink: string | null,
  campaignLink: string | null
): boolean {
  switch (type) {
    case "DECK":
      return !!presignedFileUrl
    case "VIDEO":
      return !!(externalLink || presignedFileUrl)
    case "CAMPAIGN":
      return !!(presignedFileUrl || externalLink || campaignLink)
    case "ASSET":
      return !!(externalLink || presignedFileUrl)
    default:
      return false
  }
}
