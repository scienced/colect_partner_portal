import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/supertokens/session"

const updateSchema = z.object({
  domain: z.string().min(1).transform((d) => d.toLowerCase().trim()).optional(),
  companyName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const data = updateSchema.parse(body)

    const domain = await prisma.allowedDomain.update({
      where: { id },
      data,
    })

    return NextResponse.json(domain)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    if ((error as any)?.code === "P2025") {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    }
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { error: "This domain is already registered" },
        { status: 409 }
      )
    }
    console.error("Update domain error:", error)
    return NextResponse.json(
      { error: "Failed to update domain" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    await prisma.allowedDomain.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if ((error as any)?.code === "P2025") {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    }
    console.error("Delete domain error:", error)
    return NextResponse.json(
      { error: "Failed to delete domain" },
      { status: 500 }
    )
  }
}
