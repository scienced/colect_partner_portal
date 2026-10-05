import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/supertokens/session"
import { getViewer } from "@/lib/access"
import { AdSetInputError, UpdateAdSetSchema, serializeAdSets, updateAdSet } from "@/lib/adSets"

export const dynamic = "force-dynamic"

// PUT: edit an ad set (admin only). Deleting goes through DELETE /api/assets/[id].
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAdmin()
    const { id } = await params
    const data = UpdateAdSetSchema.parse(await request.json())
    const row = await updateAdSet(id, data)
    const [item] = await serializeAdSets([row], await getViewer(user!))
    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    if (error instanceof AdSetInputError) {
      return error.message === "NOT_FOUND"
        ? NextResponse.json({ error: "Ad set not found" }, { status: 404 })
        : NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && /^(Unauthorized|Forbidden)/.test(error.message)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error updating ad set:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
