import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/supertokens/session"
import { prisma } from "@/lib/prisma"
import { getPresignedUrlIfNeeded } from "@/lib/s3"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    const assets = await prisma.asset.findMany({
      where: {
        ...(type ? { type: type as any } : {}),
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: "desc" },
    })

    // Generate presigned URLs in parallel
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => ({
        ...asset,
        thumbnailUrl: await getPresignedUrlIfNeeded(asset.thumbnailUrl),
        fileUrl: await getPresignedUrlIfNeeded(asset.fileUrl),
      }))
    )

    return NextResponse.json({ assets: assetsWithUrls })
  } catch (error) {
    console.error("Portal assets error:", error)
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 })
  }
}
