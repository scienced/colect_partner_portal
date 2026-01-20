import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireSession } from "@/lib/supertokens/session"
import { z } from "zod"

// Transform empty strings to null for optional URL/email fields
const emptyToNull = (val: string | null | undefined) =>
  val === "" ? null : val

const TeamMemberSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  department: z.string().min(1),
  email: z.preprocess(emptyToNull, z.string().email().optional().nullable()),
  photoUrl: z.preprocess(emptyToNull, z.string().url().optional().nullable()),
  bio: z.preprocess(emptyToNull, z.string().optional().nullable()),
  linkedIn: z.preprocess(emptyToNull, z.string().url().optional().nullable()),
  displayOrder: z.number().optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireSession()

    const teamMembers = await prisma.teamMember.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(teamMembers)
  } catch (error) {
    console.error("Error fetching team members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const data = TeamMemberSchema.parse(body)

    const teamMember = await prisma.teamMember.create({
      data,
    })

    return NextResponse.json(teamMember, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    console.error("Error creating team member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
