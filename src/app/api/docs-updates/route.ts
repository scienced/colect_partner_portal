import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireSession } from "@/lib/supertokens/session"
import { createChangelog } from "@/lib/changelog"
import { z } from "zod"

// Transform empty strings to null for optional fields
const emptyToNull = (val: unknown) => (val === "" ? null : val)

const MAX_PINNED_DOCS = 3

const DocsUpdateSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  deepLink: z.string().url(),
  category: z.preprocess(emptyToNull, z.string().optional().nullable()),
  publishedAt: z.preprocess(emptyToNull, z.string().datetime().optional().nullable()),
  isPinned: z.boolean().optional().default(false),
  pinnedAt: z.preprocess(emptyToNull, z.string().datetime().optional().nullable()),
  pinExpiresAt: z.preprocess(emptyToNull, z.string().datetime().optional().nullable()),
  pinOrder: z.number().optional().default(0),
})

export async function GET(request: NextRequest) {
  try {
    await requireSession()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    // Enforce pagination limits to prevent DoS
    const MAX_LIMIT = 100
    const rawLimit = parseInt(searchParams.get("limit") || "50")
    const limit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT)

    const where: Record<string, unknown> = {}
    if (category) where.category = category

    const now = new Date()

    const docsUpdates = await prisma.docsUpdate.findMany({
      where,
      orderBy: [
        { isPinned: "desc" },
        { pinOrder: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
    })

    // Filter out expired pins and update isPinned status
    const processedDocs = docsUpdates.map((doc) => {
      const isPinActive = doc.isPinned &&
        (!doc.pinExpiresAt || new Date(doc.pinExpiresAt) > now)

      return {
        ...doc,
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
      // Then by createdAt
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json(processedDocs)
  } catch (error) {
    console.error("Error fetching docs updates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const data = DocsUpdateSchema.parse(body)

    // Check max pinned limit if trying to pin
    if (data.isPinned) {
      const pinnedCount = await prisma.docsUpdate.count({
        where: {
          isPinned: true,
          OR: [
            { pinExpiresAt: null },
            { pinExpiresAt: { gt: new Date() } },
          ],
        },
      })

      if (pinnedCount >= MAX_PINNED_DOCS) {
        return NextResponse.json(
          { error: `Maximum of ${MAX_PINNED_DOCS} pinned documentation updates allowed` },
          { status: 400 }
        )
      }
    }

    const docsUpdate = await prisma.docsUpdate.create({
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        pinnedAt: data.isPinned ? new Date() : null,
        pinExpiresAt: data.pinExpiresAt ? new Date(data.pinExpiresAt) : null,
      },
    })

    await createChangelog("created", "docs_update", docsUpdate.id, docsUpdate.title)

    return NextResponse.json(docsUpdate, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    console.error("Error creating docs update:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
