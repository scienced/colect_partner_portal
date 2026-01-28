import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/supertokens/session"
import { prisma } from "@/lib/prisma"
import { getPresignedUrls } from "@/lib/s3"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    const now = new Date()

    const assets = await prisma.asset.findMany({
      where: {
        ...(type ? { type: type as any } : {}),
        publishedAt: { not: null },
      },
      orderBy: [
        // Pinned items first (active pins only)
        { isPinned: "desc" },
        { pinOrder: "desc" },
        { publishedAt: "desc" },
      ],
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        fileUrl: true,
        thumbnailUrl: true,
        blurDataUrl: true,
        externalLink: true,
        language: true,
        persona: true,
        campaignGoal: true,
        sentAt: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
        isPinned: true,
        pinnedAt: true,
        pinExpiresAt: true,
        pinOrder: true,
      },
    })

    // Filter out expired pins and sort correctly
    const processedAssets = assets.map((asset) => {
      // Check if pin has expired
      const isPinActive = asset.isPinned &&
        (!asset.pinExpiresAt || new Date(asset.pinExpiresAt) > now)

      return {
        ...asset,
        isPinned: isPinActive,
      }
    }).sort((a, b) => {
      // Sort by active pin status first
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      // Then by pin order for pinned items
      if (a.isPinned && b.isPinned) {
        if (a.pinOrder !== b.pinOrder) return b.pinOrder - a.pinOrder
      }
      // Then by publishedAt
      const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return bDate - aDate
    })

    // Batch presign all URLs at once (more efficient than N+1 calls)
    const thumbnailUrls = processedAssets.map((a) => a.thumbnailUrl)
    const fileUrls = processedAssets.map((a) => a.fileUrl)

    const [presignedThumbnails, presignedFiles] = await Promise.all([
      getPresignedUrls(thumbnailUrls),
      getPresignedUrls(fileUrls),
    ])

    // Map presigned URLs back to assets
    const assetsWithUrls = processedAssets.map((asset, i) => ({
      ...asset,
      thumbnailUrl: presignedThumbnails[i],
      fileUrl: presignedFiles[i],
    }))

    return NextResponse.json({ assets: assetsWithUrls })
  } catch (error) {
    console.error("Portal assets error:", error)
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 })
  }
}
