import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/supertokens/session"
import { createChangelog } from "@/lib/changelog"
import { z } from "zod"
import { AssetWriteError, UpdateAssetSchema, updateAsset } from "@/lib/assetWrites"

// GET: Get single asset — admin only (drafts + employee-only assets).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { variants: true },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const body = await request.json()
    const data = UpdateAssetSchema.parse(body)
    const asset = await updateAsset(id, data)

    return NextResponse.json(asset)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const existing = await prisma.asset.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Variants cascade via onDelete: Cascade on AssetVariant.asset.
    await prisma.asset.delete({
      where: { id },
    })

    await createChangelog("deleted", "asset", id, existing.title)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
