import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/supertokens/session"
import { AssetType } from "@prisma/client"
import { z } from "zod"
import { canonicalLanguage } from "@/lib/assetVariants"
import { AssetWriteError, CreateAssetSchema, createAsset } from "@/lib/assetWrites"

// GET: List assets (with search and filters) — admin only. Returns drafts
// and employee-only assets, so it must never be reachable by partners.
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const type = searchParams.get("type")
    const region = searchParams.get("region")
    const language = searchParams.get("language")
    // Enforce pagination limits to prevent DoS
    const MAX_LIMIT = 100
    const rawLimit = parseInt(searchParams.get("limit") || "50")
    const rawOffset = parseInt(searchParams.get("offset") || "0")
    const limit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
    const offset = Math.max(rawOffset, 0)

    const where: Record<string, unknown> = {}

    if (type) where.type = type as AssetType
    if (region) where.region = { has: region }
    if (language) where.availableLanguages = { has: canonicalLanguage(language) }
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
        include: { variants: true },
      }),
      prisma.asset.count({ where }),
    ])

    return NextResponse.json({ assets, total })
  } catch (error) {
    if (error instanceof Error && /^(Unauthorized|Forbidden)/.test(error.message)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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
    const data = CreateAssetSchema.parse(body)
    const asset = await createAsset(data)

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof AssetWriteError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error creating asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
