import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/supertokens/session"
import { trackEvent } from "@/lib/analytics"
import { AnalyticsEventType } from "@prisma/client"
import { z } from "zod"

const eventSchema = z.object({
  type: z.enum(["PAGE_VIEW", "ASSET_CLICK", "ASSET_DOWNLOAD", "SEARCH_QUERY"]),
  pagePath: z.string().optional(),
  assetId: z.string().optional(),
  assetTitle: z.string().optional(),
  assetType: z.string().optional(),
  assetLanguage: z.string().optional(),
  searchQuery: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validated = eventSchema.parse(body)

    await trackEvent({
      type: validated.type as AnalyticsEventType,
      userId: session.user.id,
      userEmail: session.user.email,
      pagePath: validated.pagePath,
      assetId: validated.assetId,
      assetTitle: validated.assetTitle,
      assetType: validated.assetType,
      assetLanguage: validated.assetLanguage,
      searchQuery: validated.searchQuery,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Analytics event error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid event data" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 })
  }
}
