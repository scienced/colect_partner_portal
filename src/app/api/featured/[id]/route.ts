import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/supertokens/session"
import { z } from "zod"

const FeaturedContentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  entityType: z.enum(["asset", "docs_update", "product_update"]),
  entityId: z.string().min(1),
  displayOrder: z.number().default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const featuredContent = await prisma.featuredContent.findUnique({
      where: { id: params.id },
      include: {
        asset: true,
        docsUpdate: true,
        productUpdate: true,
      },
    })

    if (!featuredContent) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(featuredContent)
  } catch (error) {
    console.error("Error fetching featured content:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const body = await request.json()
    const data = FeaturedContentSchema.parse(body)

    // Build the relation based on entity type
    const relationData: Record<string, string | null> = {
      assetId: null,
      docsUpdateId: null,
      productUpdateId: null,
    }
    if (data.entityType === "asset") {
      relationData.assetId = data.entityId
    } else if (data.entityType === "docs_update") {
      relationData.docsUpdateId = data.entityId
    } else if (data.entityType === "product_update") {
      relationData.productUpdateId = data.entityId
    }

    const featuredContent = await prisma.featuredContent.update({
      where: { id: params.id },
      data: {
        title: data.title,
        description: data.description,
        entityType: data.entityType,
        displayOrder: data.displayOrder,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : null,
        ...relationData,
      },
      include: {
        asset: true,
        docsUpdate: true,
        productUpdate: true,
      },
    })

    return NextResponse.json(featuredContent)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    console.error("Error updating featured content:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    await prisma.featuredContent.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting featured content:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
