import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const CRON_SECRET = process.env.CRON_SECRET || ""

export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()

    // Update expired asset pins
    const expiredAssets = await prisma.asset.updateMany({
      where: {
        isPinned: true,
        pinExpiresAt: {
          lte: now,
        },
      },
      data: {
        isPinned: false,
      },
    })

    // Update expired docs update pins
    const expiredDocs = await prisma.docsUpdate.updateMany({
      where: {
        isPinned: true,
        pinExpiresAt: {
          lte: now,
        },
      },
      data: {
        isPinned: false,
      },
    })

    return NextResponse.json({
      success: true,
      unpinnedAssets: expiredAssets.count,
      unpinnedDocs: expiredDocs.count,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("Unpin expired cron error:", error)
    return NextResponse.json(
      { error: "Failed to unpin expired items" },
      { status: 500 }
    )
  }
}

// GET for status check
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()

    // Count assets that would be unpinned
    const expiredAssetsCount = await prisma.asset.count({
      where: {
        isPinned: true,
        pinExpiresAt: {
          lte: now,
        },
      },
    })

    // Count docs that would be unpinned
    const expiredDocsCount = await prisma.docsUpdate.count({
      where: {
        isPinned: true,
        pinExpiresAt: {
          lte: now,
        },
      },
    })

    // Count currently pinned items
    const pinnedAssetsCount = await prisma.asset.count({
      where: { isPinned: true },
    })

    const pinnedDocsCount = await prisma.docsUpdate.count({
      where: { isPinned: true },
    })

    return NextResponse.json({
      dryRun: true,
      currentlyPinned: {
        assets: pinnedAssetsCount,
        docs: pinnedDocsCount,
      },
      wouldUnpin: {
        assets: expiredAssetsCount,
        docs: expiredDocsCount,
      },
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("Unpin expired preview error:", error)
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    )
  }
}
