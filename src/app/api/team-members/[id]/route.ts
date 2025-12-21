import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/supertokens/session"
import { z } from "zod"

const UpdateTeamMemberSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  bio: z.string().optional().nullable(),
  linkedIn: z.string().url().optional().nullable(),
  displayOrder: z.number().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const body = await request.json()
    const data = UpdateTeamMemberSchema.parse(body)

    const teamMember = await prisma.teamMember.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(teamMember)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 })
    }
    console.error("Error updating team member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    await prisma.teamMember.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting team member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
