import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supertokens/session"
import {
  getAnalyticsSummary,
  getPageViewsOverTime,
  getTopDomains,
  getTopUsers,
  getTopAssets,
  getTopSearchQueries,
} from "@/lib/analytics"

export async function GET(request: NextRequest) {
  try {
    // Require admin access
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const range = searchParams.get("range") || "7d"

    // Validate range
    if (!["24h", "7d", "30d", "3m"].includes(range)) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
    }

    // Fetch all analytics data in parallel
    const [summary, pageViewsOverTime, topDomains, topUsers, topAssets, topSearchQueries] =
      await Promise.all([
        getAnalyticsSummary(range),
        getPageViewsOverTime(range),
        getTopDomains(range),
        getTopUsers(range),
        getTopAssets(range),
        getTopSearchQueries(range),
      ])

    return NextResponse.json({
      summary,
      pageViewsOverTime,
      topDomains,
      topUsers,
      topAssets,
      topSearchQueries,
    })
  } catch (error) {
    console.error("Analytics fetch error:", error)
    if (error instanceof Error && error.message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
