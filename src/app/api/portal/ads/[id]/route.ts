import { NextRequest, NextResponse } from "next/server"
import { getSessionViewer } from "@/lib/supertokens/session"
import { findAdSets, serializeAdSets } from "@/lib/adSets"

export const dynamic = "force-dynamic"

// GET: one published ad set (used by the homepage to open the ad drawer).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getSessionViewer()
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { rows } = await findAdSets(auth.viewer, { id })
    if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const [item] = await serializeAdSets(rows, auth.viewer)
    return NextResponse.json(item)
  } catch (error) {
    console.error("Portal ad set error:", error)
    return NextResponse.json({ error: "Failed to fetch ad set" }, { status: 500 })
  }
}
