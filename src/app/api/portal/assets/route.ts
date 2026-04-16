import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/supertokens/session"
import { prisma } from "@/lib/prisma"
import { getPresignedUrls } from "@/lib/s3"
import { AssetType } from "@prisma/client"
import { canonicalLanguage, defaultVariant } from "@/lib/assetVariants"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const language = searchParams.get("language")

    const now = new Date()

    const assets = await prisma.asset.findMany({
      where: {
        ...(type ? { type: type as AssetType } : {}),
        ...(language ? { availableLanguages: { has: canonicalLanguage(language) } } : {}),
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
        thumbnailUrl: true,
        blurDataUrl: true,
        availableLanguages: true,
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
        variants: {
          select: {
            id: true,
            language: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
            externalLink: true,
            displayOrder: true,
          },
          orderBy: [{ displayOrder: "asc" }, { language: "asc" }],
        },
      },
    })

    // Filter out expired pins and sort correctly
    const processedAssets = assets
      .map((asset) => {
        // Check if pin has expired
        const isPinActive = asset.isPinned &&
          (!asset.pinExpiresAt || new Date(asset.pinExpiresAt) > now)

        return {
          ...asset,
          isPinned: isPinActive,
        }
      })
      .sort((a, b) => {
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

    // On-demand presigning strategy: presign ONLY the default variant's file
    // for each asset (what the card and drawer will show first). Non-default
    // variants are presigned when the user toggles to them via
    // /api/portal/assets/[id]/variant?language=XX.
    const thumbnailUrls = processedAssets.map((a) => a.thumbnailUrl)
    const defaultFileUrls = processedAssets.map(
      (a) => defaultVariant(a.variants)?.fileUrl ?? null
    )

    const [presignedThumbnails, presignedDefaultFiles] = await Promise.all([
      getPresignedUrls(thumbnailUrls),
      getPresignedUrls(defaultFileUrls),
    ])

    // Map presigned URLs back to assets. Expose fileUrl/externalLink as
    // the DEFAULT variant's values so legacy card code paths still work,
    // and include the full `variants` array for new code that renders
    // the language toggle.
    const assetsWithUrls = processedAssets.map((asset, i) => {
      const def = defaultVariant(asset.variants)
      return {
        ...asset,
        thumbnailUrl: presignedThumbnails[i],
        fileUrl: presignedDefaultFiles[i],
        externalLink: def?.externalLink ?? null,
      }
    })

    return NextResponse.json({ assets: assetsWithUrls })
  } catch (error) {
    console.error("Portal assets error:", error)
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 })
  }
}
