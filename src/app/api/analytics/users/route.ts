import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supertokens/session"
import {
  countActiveUsers,
  getTopUsers,
} from "@/lib/analytics"

const VALID_RANGES = ["24h", "7d", "30d", "3m"] as const

/**
 * GET /api/analytics/users
 *
 * Paginated list of users ranked by total event count in the selected range.
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

    const [users, total] = await Promise.all([
      getTopUsers(range, limit, skip),
      countActiveUsers(range),
    ])

    return NextResponse.json({ users, total, limit, skip, range })
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching analytics users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
