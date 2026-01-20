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

    const assets = await prisma.asset.findMany({
      where: {
        ...(type ? { type: type as any } : {}),
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: "desc" },
    })

    // Batch presign all URLs at once (more efficient than N+1 calls)
    const thumbnailUrls = assets.map((a) => a.thumbnailUrl)
    const fileUrls = assets.map((a) => a.fileUrl)

    const [presignedThumbnails, presignedFiles] = await Promise.all([
      getPresignedUrls(thumbnailUrls),
      getPresignedUrls(fileUrls),
    ])

    // Map presigned URLs back to assets
    const assetsWithUrls = assets.map((asset, i) => ({
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
