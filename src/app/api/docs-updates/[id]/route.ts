import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/supertokens/session"
import { createChangelog } from "@/lib/changelog"
import { z } from "zod"

const DocsUpdateSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  deepLink: z.string().url(),
  category: z.string().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const docsUpdate = await prisma.docsUpdate.findUnique({
      where: { id: params.id },
    })

    if (!docsUpdate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(docsUpdate)
  } catch (error) {
    console.error("Error fetching docs update:", error)
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
    const data = DocsUpdateSchema.parse(body)

    const docsUpdate = await prisma.docsUpdate.update({
      where: { id: params.id },
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      },
    })

    await createChangelog("updated", "docs_update", docsUpdate.id, docsUpdate.title)

    return NextResponse.json(docsUpdate)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    console.error("Error updating docs update:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const docsUpdate = await prisma.docsUpdate.delete({
      where: { id: params.id },
    })

    await createChangelog("deleted", "docs_update", docsUpdate.id, docsUpdate.title)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting docs update:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
