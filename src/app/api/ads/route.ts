import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/supertokens/session"
import { getViewer } from "@/lib/access"
import { AdSetInputError, CreateAdSetSchema, createAdSet, findAdSets, serializeAdSets } from "@/lib/adSets"

export const dynamic = "force-dynamic"

// GET: every ad set, drafts included (admin dashboard)
export async function GET() {
  try {
    const { user } = await requireAdmin()
    const viewer = await getViewer(user!)
    const { rows } = await findAdSets(viewer, { includeDrafts: true })
    return NextResponse.json({ items: await serializeAdSets(rows, viewer) })
  } catch (error) {
    if (error instanceof Error && /^(Unauthorized|Forbidden)/.test(error.message)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error listing ad sets:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST: create an ad set (admin only)
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdmin()
    const data = CreateAdSetSchema.parse(await request.json())
    const row = await createAdSet(data)
    const [item] = await serializeAdSets([row], await getViewer(user!))
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    if (error instanceof AdSetInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && /^(Unauthorized|Forbidden)/.test(error.message)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error creating ad set:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
