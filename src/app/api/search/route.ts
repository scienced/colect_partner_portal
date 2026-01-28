import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/supertokens/session"
import { trackSearchQuery } from "@/lib/analytics"
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

export async function GET(request: NextRequest) {
  try {
    // Check session - return 401 if not authenticated
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Track search query (don't await to not block the search)
    if (session.user) {
      trackSearchQuery(session.user.id, session.user.email, query).catch(console.error)
    }

    const searchTerm = `%${query}%`

    // Search across multiple tables in parallel
    const [assets, docsUpdates, productUpdates, teamMembers] = await Promise.all([
      prisma.asset.findMany({
        where: {
          AND: [
            { publishedAt: { not: null } },
            {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          description: true,
          thumbnailUrl: true,
          blurDataUrl: true,
          fileUrl: true,
          externalLink: true,
          language: true,
          persona: true,
          campaignGoal: true,
          sentAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.docsUpdate.findMany({
        where: {
          AND: [
            { publishedAt: { not: null } },
            {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { summary: { contains: query, mode: "insensitive" } },
              ],
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          summary: true,
          deepLink: true,
        },
      }),
      prisma.productUpdate.findMany({
        where: {
          AND: [
            { publishedAt: { not: null } },
            {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { content: { contains: query, mode: "insensitive" } },
              ],
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          updateType: true,
          content: true,
        },
      }),
      prisma.teamMember.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { role: { contains: query, mode: "insensitive" } },
            { department: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          role: true,
          department: true,
        },
      }),
    ])

    // Batch presign all S3 URLs at once
    const thumbnailUrls = assets.map(a => a.thumbnailUrl)
    const fileUrls = assets.map(a => a.fileUrl)
    const [presignedThumbnails, presignedFiles] = await Promise.all([
      getPresignedUrls(thumbnailUrls),
      getPresignedUrls(fileUrls),
    ])

    // Format results with categories
    const assetResults = assets.map((a, i) => {
      const thumbnailUrl = presignedThumbnails[i]
        ?? (a.type === "VIDEO" ? getYouTubeThumbnail(a.externalLink) : null)

      return {
        id: a.id,
        title: a.title,
        subtitle: a.description?.slice(0, 60) || a.type,
        category: "asset" as const,
        type: a.type,
        href: a.type === "DECK" ? "/decks" : a.type === "CAMPAIGN" ? "/campaigns" : a.type === "VIDEO" ? "/videos" : "/assets",
        // Full asset data for drawer
        description: a.description,
        thumbnailUrl,
        blurDataUrl: a.blurDataUrl,
        fileUrl: presignedFiles[i],
        externalLink: a.externalLink,
        language: a.language,
        persona: a.persona,
        campaignGoal: a.campaignGoal,
        sentAt: a.sentAt?.toISOString() || null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }
    })

    const results = [
      ...assetResults,
      ...docsUpdates.map((d) => ({
        id: d.id,
        title: d.title,
        subtitle: d.summary?.slice(0, 60),
        category: "docs" as const,
        href: d.deepLink,
        external: true,
      })),
      ...productUpdates.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.content?.slice(0, 60),
        category: "product" as const,
        type: p.updateType,
        href: "/product",
      })),
      ...teamMembers.map((t) => ({
        id: t.id,
        title: t.name,
        subtitle: `${t.role} - ${t.department}`,
        category: "team" as const,
        href: "/who-is-who",
      })),
    ]

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
