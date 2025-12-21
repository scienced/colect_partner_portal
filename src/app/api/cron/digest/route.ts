import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendDigestEmail, DigestContent } from "@/lib/email"

const CRON_SECRET = process.env.CRON_SECRET || ""

export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get last digest time
    let digestState = await prisma.digestState.findUnique({
      where: { id: "singleton" },
    })

    if (!digestState) {
      // Create initial state if it doesn't exist
      digestState = await prisma.digestState.create({
        data: {
          id: "singleton",
          lastSentAt: null,
        },
      })
    }

    // Default to 7 days ago if no previous digest
    const sinceDate = digestState.lastSentAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Fetch new content since last digest
    const [newAssets, newDocsUpdates, newProductUpdates] = await Promise.all([
      prisma.asset.findMany({
        where: {
          publishedAt: {
            not: null,
            gt: sinceDate,
          },
        },
        select: {
          id: true,
          title: true,
          type: true,
        },
        orderBy: { publishedAt: "desc" },
      }),
      prisma.docsUpdate.findMany({
        where: {
          publishedAt: {
            not: null,
            gt: sinceDate,
          },
        },
        select: {
          id: true,
          title: true,
        },
        orderBy: { publishedAt: "desc" },
      }),
      prisma.productUpdate.findMany({
        where: {
          publishedAt: {
            not: null,
            gt: sinceDate,
          },
        },
        select: {
          id: true,
          title: true,
          updateType: true,
        },
        orderBy: { publishedAt: "desc" },
      }),
    ])

    const digestContent: DigestContent = {
      newAssets,
      newDocsUpdates,
      newProductUpdates,
    }

    // Check if there's any content to send
    const hasContent =
      newAssets.length > 0 ||
      newDocsUpdates.length > 0 ||
      newProductUpdates.length > 0

    if (!hasContent) {
      return NextResponse.json({
        success: true,
        message: "No new content to send",
        emailsSent: 0,
      })
    }

    // Get all partner users
    const partners = await prisma.user.findMany({
      where: {
        role: "PARTNER",
      },
      select: {
        email: true,
        name: true,
      },
    })

    // Send emails to all partners
    let emailsSent = 0
    const errors: string[] = []

    for (const partner of partners) {
      if (!partner.email) continue

      try {
        await sendDigestEmail(
          partner.email,
          partner.name || "Partner",
          digestContent
        )
        emailsSent++
      } catch (error) {
        console.error(`Failed to send digest to ${partner.email}:`, error)
        errors.push(partner.email)
      }
    }

    // Update last sent time
    await prisma.digestState.update({
      where: { id: "singleton" },
      data: { lastSentAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      emailsSent,
      totalPartners: partners.length,
      errors: errors.length > 0 ? errors : undefined,
      content: {
        newAssets: newAssets.length,
        newDocsUpdates: newDocsUpdates.length,
        newProductUpdates: newProductUpdates.length,
      },
    })
  } catch (error) {
    console.error("Digest cron error:", error)
    return NextResponse.json(
      { error: "Failed to process digest" },
      { status: 500 }
    )
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const dryRun = searchParams.get("dry_run") === "true"

  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get last digest time
    const digestState = await prisma.digestState.findUnique({
      where: { id: "singleton" },
    })

    const sinceDate = digestState?.lastSentAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Fetch new content since last digest
    const [newAssets, newDocsUpdates, newProductUpdates, partners] = await Promise.all([
      prisma.asset.findMany({
        where: {
          publishedAt: {
            not: null,
            gt: sinceDate,
          },
        },
        select: {
          id: true,
          title: true,
          type: true,
        },
      }),
      prisma.docsUpdate.findMany({
        where: {
          publishedAt: {
            not: null,
            gt: sinceDate,
          },
        },
        select: {
          id: true,
          title: true,
        },
      }),
      prisma.productUpdate.findMany({
        where: {
          publishedAt: {
            not: null,
            gt: sinceDate,
          },
        },
        select: {
          id: true,
          title: true,
          updateType: true,
        },
      }),
      prisma.user.count({
        where: {
          role: "PARTNER",
        },
      }),
    ])

    return NextResponse.json({
      dryRun: true,
      lastSentAt: digestState?.lastSentAt,
      sinceDate,
      partnersCount: partners,
      content: {
        newAssets: newAssets.length,
        newDocsUpdates: newDocsUpdates.length,
        newProductUpdates: newProductUpdates.length,
      },
      details: {
        assets: newAssets,
        docsUpdates: newDocsUpdates,
        productUpdates: newProductUpdates,
      },
    })
  } catch (error) {
    console.error("Digest preview error:", error)
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    )
  }
}
