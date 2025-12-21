import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/supertokens/session"

const domainSchema = z.object({
  domain: z.string().min(1).transform((d) => d.toLowerCase().trim()),
  companyName: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const domains = await prisma.allowedDomain.findMany({
    orderBy: { domain: "asc" },
  })

  return NextResponse.json(domains)
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = domainSchema.parse(body)

    const domain = await prisma.allowedDomain.create({
      data: {
        domain: data.domain,
        companyName: data.companyName,
        notes: data.notes,
        isActive: data.isActive ?? true,
      },
    })

    return NextResponse.json(domain, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    // Check for unique constraint violation
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { error: "This domain is already registered" },
        { status: 409 }
      )
    }
    console.error("Create domain error:", error)
    return NextResponse.json(
      { error: "Failed to create domain" },
      { status: 500 }
    )
  }
}
