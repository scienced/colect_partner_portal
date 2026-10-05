import { NextRequest, NextResponse } from "next/server"
import { getSessionViewer } from "@/lib/supertokens/session"
import { findAdSets, serializeAdSets } from "@/lib/adSets"

export const dynamic = "force-dynamic"

// GET: published ad sets the viewer may see (partners: EVERYONE only).
export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionViewer()
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const brand = new URL(request.url).searchParams.get("brand")?.toUpperCase() || null
    const { rows } = await findAdSets(auth.viewer, { brand })
    return NextResponse.json({ items: await serializeAdSets(rows, auth.viewer) })
  } catch (error) {
    console.error("Portal social ads error:", error)
    return NextResponse.json({ error: "Failed to fetch social ads" }, { status: 500 })
  }
}
