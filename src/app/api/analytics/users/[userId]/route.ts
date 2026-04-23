import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supertokens/session"
import {
  getAnalyticsUserProfile,
  getUserEventsOverTime,
  getUserEventsSummary,
  getUserRecentEvents,
  getUserTopAssets,
} from "@/lib/analytics"

const VALID_RANGES = ["24h", "7d", "30d", "3m"] as const

/**
 * GET /api/analytics/users/[userId]
 *
 * All drill-down data for a single user in the selected date range:
 *   - profile (name, email, domain, companyName)
 *   - summary (totals per event type + first/last seen)
 *   - pageViewsOverTime (daily bucket)
 *   - downloadsOverTime (daily bucket)
 *   - topAssets (their most-clicked/downloaded assets)
 *   - recentEvents (last 50 events)
 *
 * Query params:
 *   range  — "24h" | "7d" | "30d" | "3m" (default "7d")
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin()

    const { userId } = await params
    const { searchParams } = request.nextUrl
    const range = searchParams.get("range") || "7d"
    if (!VALID_RANGES.includes(range as (typeof VALID_RANGES)[number])) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
    }

    const profile = await getAnalyticsUserProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const [
      summary,
      pageViewsOverTime,
      downloadsOverTime,
      topAssets,
      recentEvents,
    ] = await Promise.all([
      getUserEventsSummary(userId, range),
      getUserEventsOverTime(userId, range, "PAGE_VIEW"),
      getUserEventsOverTime(userId, range, "ASSET_DOWNLOAD"),
      getUserTopAssets(userId, range, 10),
      getUserRecentEvents(userId, range, 50),
    ])

    return NextResponse.json({
      profile,
      summary,
      pageViewsOverTime,
      downloadsOverTime,
      topAssets,
      recentEvents,
      range,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching user analytics:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
