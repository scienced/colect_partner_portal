import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireSession } from "@/lib/supertokens/session"
import { createChangelog } from "@/lib/changelog"
import { z } from "zod"

const UpdateAssetSchema = z.object({
  type: z.enum(["DECK", "CAMPAIGN", "ASSET", "VIDEO"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  fileType: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  region: z.array(z.string()).optional(),
  language: z.array(z.string()).optional(),
  persona: z.array(z.string()).optional(),
  campaignGoal: z.string().optional().nullable(),
  campaignLink: z.string().optional().nullable(),
  templateContent: z.string().optional().nullable(),
  externalLink: z.string().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
})

// GET: Get single asset
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSession()

    const asset = await prisma.asset.findUnique({
      where: { id: params.id },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error("Error fetching asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT: Update asset (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const body = await request.json()
    const data = UpdateAssetSchema.parse(body)

    const existing = await prisma.asset.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const asset = await prisma.asset.update({
      where: { id: params.id },
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : data.publishedAt === null ? null : undefined,
      },
    })

    await createChangelog("updated", "asset", asset.id, asset.title)

    return NextResponse.json(asset)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE: Delete asset (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const existing = await prisma.asset.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    await prisma.asset.delete({
      where: { id: params.id },
    })

    await createChangelog("deleted", "asset", params.id, existing.title)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
