import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireSession } from "@/lib/supertokens/session"
import { createChangelog } from "@/lib/changelog"
import { AssetType } from "@prisma/client"
import { z } from "zod"

const AssetSchema = z.object({
  type: z.enum(["DECK", "CAMPAIGN", "ASSET", "VIDEO"]),
  title: z.string().min(1),
  description: z.string().optional(),
  fileUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
  region: z.array(z.string()).default([]),
  language: z.array(z.string()).default([]),
  persona: z.array(z.string()).default([]),
  campaignGoal: z.string().optional(),
  campaignLink: z.string().optional(),
  templateContent: z.string().optional(),
  externalLink: z.string().optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  sentAt: z.string().datetime().optional().nullable(),
})

// GET: List assets (with search and filters)
export async function GET(request: NextRequest) {
  try {
    await requireSession()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const type = searchParams.get("type")
    const region = searchParams.get("region")
    const language = searchParams.get("language")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where: Record<string, unknown> = {}

    if (type) where.type = type as AssetType
    if (region) where.region = { has: region }
    if (language) where.language = { has: language }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.asset.count({ where }),
    ])

    return NextResponse.json({ assets, total })
  } catch (error) {
    console.error("Error fetching assets:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST: Create asset (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const data = AssetSchema.parse(body)

    const asset = await prisma.asset.create({
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        sentAt: data.sentAt ? new Date(data.sentAt) : null,
      },
    })

    await createChangelog("created", "asset", asset.id, asset.title)

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
