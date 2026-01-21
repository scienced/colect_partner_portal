import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireSession } from "@/lib/supertokens/session"
import { createChangelog } from "@/lib/changelog"
import { z } from "zod"

// Transform empty strings to null for optional fields
const emptyToNull = (val: unknown) => (val === "" ? null : val)

const DocsUpdateSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  deepLink: z.string().url(),
  category: z.preprocess(emptyToNull, z.string().optional().nullable()),
  publishedAt: z.preprocess(emptyToNull, z.string().datetime().optional().nullable()),
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

    const docsUpdates = await prisma.docsUpdate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json(docsUpdates)
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

    const docsUpdate = await prisma.docsUpdate.create({
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
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
