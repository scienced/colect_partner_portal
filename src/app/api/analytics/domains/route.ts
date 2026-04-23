import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supertokens/session"
import { countActiveDomains, getTopDomains } from "@/lib/analytics"

const VALID_RANGES = ["24h", "7d", "30d", "3m"] as const

/**
 * GET /api/analytics/domains
 *
 * Paginated list of partner domains ranked by total event count.
 *
 * Query params:
 *   range  — "24h" | "7d" | "30d" | "3m" (default "7d")
 *   limit  — page size (default 25, max 100)
 *   skip   — offset for pagination (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = request.nextUrl
    const range = searchParams.get("range") || "7d"
    if (!VALID_RANGES.includes(range as (typeof VALID_RANGES)[number])) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
    }

    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25"), 1), 100)
    const skip = Math.max(parseInt(searchParams.get("skip") || "0"), 0)

    const [domains, total] = await Promise.all([
      getTopDomains(range, limit, skip),
      countActiveDomains(range),
    ])

    return NextResponse.json({ domains, total, limit, skip, range })
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching analytics domains:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
