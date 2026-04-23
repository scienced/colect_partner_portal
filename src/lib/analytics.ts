import { prisma } from "./prisma"
import { AnalyticsEventType } from "@prisma/client"

interface TrackEventParams {
  type: AnalyticsEventType
  userId: string
  userEmail: string
  pagePath?: string
  assetId?: string
  assetTitle?: string
  assetType?: string
  assetLanguage?: string
  searchQuery?: string
}

/**
 * Extract domain from email address
 */
function getDomainFromEmail(email: string): string {
  const parts = email.split("@")
  return parts[1] || "unknown"
}

/**
 * Record an analytics event
 */
export async function trackEvent(params: TrackEventParams) {
  const userDomain = getDomainFromEmail(params.userEmail)

  await prisma.analyticsEvent.create({
    data: {
      type: params.type,
      userId: params.userId,
      userEmail: params.userEmail,
      userDomain,
      pagePath: params.pagePath,
      assetId: params.assetId,
      assetTitle: params.assetTitle,
      assetType: params.assetType,
      assetLanguage: params.assetLanguage,
      searchQuery: params.searchQuery,
    },
  })
}

/**
 * Record a page view
 */
export async function trackPageView(
  userId: string,
  userEmail: string,
  pagePath: string
) {
  return trackEvent({
    type: "PAGE_VIEW",
    userId,
    userEmail,
    pagePath,
  })
}

/**
 * Record an asset click
 */
export async function trackAssetClick(
  userId: string,
  userEmail: string,
  assetId: string,
  assetTitle: string,
  assetType: string,
  assetLanguage?: string
) {
  return trackEvent({
    type: "ASSET_CLICK",
    userId,
    userEmail,
    assetId,
    assetTitle,
    assetType,
    assetLanguage,
  })
}

/**
 * Record an asset download
 */
export async function trackAssetDownload(
  userId: string,
  userEmail: string,
  assetId: string,
  assetTitle: string,
  assetType: string,
  assetLanguage?: string
) {
  return trackEvent({
    type: "ASSET_DOWNLOAD",
    userId,
    userEmail,
    assetId,
    assetTitle,
    assetType,
    assetLanguage,
  })
}

/**
 * Record a search query
 */
export async function trackSearchQuery(
  userId: string,
  userEmail: string,
  searchQuery: string
) {
  return trackEvent({
    type: "SEARCH_QUERY",
    userId,
    userEmail,
    searchQuery,
  })
}

/**
 * Get date range for analytics queries
 */
export function getDateRange(range: string): Date {
  const now = new Date()
  switch (range) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case "3m":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }
}

/**
 * Get analytics summary for a date range
 */
export async function getAnalyticsSummary(range: string) {
  const since = getDateRange(range)

  // Get total counts
  const [pageViews, assetClicks, assetDownloads, searches] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { type: "PAGE_VIEW", createdAt: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { type: "ASSET_CLICK", createdAt: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { type: "ASSET_DOWNLOAD", createdAt: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { type: "SEARCH_QUERY", createdAt: { gte: since } },
    }),
  ])

  // Get unique users count
  const uniqueUsers = await prisma.analyticsEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since } },
  })

  return {
    pageViews,
    assetClicks,
    assetDownloads,
    searches,
    uniqueUsers: uniqueUsers.length,
  }
}

/**
 * Get page views over time for charting
 */
export async function getPageViewsOverTime(range: string) {
  const since = getDateRange(range)

  const events = await prisma.analyticsEvent.findMany({
    where: {
      type: "PAGE_VIEW",
      createdAt: { gte: since },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  // Group by date
  const grouped = events.reduce((acc, event) => {
    const date = event.createdAt.toISOString().split("T")[0]
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Fill in missing dates
  const result: { date: string; count: number }[] = []
  const current = new Date(since)
  const end = new Date()

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0]
    result.push({
      date: dateStr,
      count: grouped[dateStr] || 0,
    })
    current.setDate(current.getDate() + 1)
  }

  return result
}

/**
 * Get top domains by activity. When `skip` is provided, also returns the
 * total distinct-domain count so the caller can paginate.
 */
export async function getTopDomains(range: string, limit = 10, skip = 0) {
  const since = getDateRange(range)

  const domains = await prisma.analyticsEvent.groupBy({
    by: ["userDomain"],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
    skip,
  })

  // Get company names from AllowedDomain
  const domainNames = domains.map((d) => d.userDomain)
  const allowedDomains = await prisma.allowedDomain.findMany({
    where: { domain: { in: domainNames } },
    select: { domain: true, companyName: true },
  })

  const domainMap = new Map(allowedDomains.map((d) => [d.domain, d.companyName]))

  return domains.map((d) => ({
    domain: d.userDomain,
    companyName: domainMap.get(d.userDomain) || null,
    count: d._count.id,
  }))
}

/**
 * Count distinct domains active in the given range. Used for pagination.
 */
export async function countActiveDomains(range: string): Promise<number> {
  const since = getDateRange(range)
  const rows = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { userDomain: true },
    distinct: ["userDomain"],
  })
  return rows.length
}

/**
 * Get top users by activity. Supports pagination via `skip`.
 */
export async function getTopUsers(range: string, limit = 10, skip = 0) {
  const since = getDateRange(range)

  const users = await prisma.analyticsEvent.groupBy({
    by: ["userId", "userEmail"],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
    skip,
  })

  // Get user names
  const userIds = users.map((u) => u.userId)
  const userRecords = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  })

  const userMap = new Map(userRecords.map((u) => [u.id, u.name]))

  return users.map((u) => ({
    userId: u.userId,
    email: u.userEmail,
    name: userMap.get(u.userId) || null,
    count: u._count.id,
  }))
}

/**
 * Count distinct users active in the given range. Used for pagination.
 */
export async function countActiveUsers(range: string): Promise<number> {
  const since = getDateRange(range)
  const rows = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { userId: true },
    distinct: ["userId"],
  })
  return rows.length
}

/**
 * Get top assets by clicks and downloads
 */
export async function getTopAssets(range: string, limit = 10) {
  const since = getDateRange(range)

  // Get click and download counts per asset
  const clicks = await prisma.analyticsEvent.groupBy({
    by: ["assetId", "assetTitle", "assetType"],
    where: {
      type: "ASSET_CLICK",
      createdAt: { gte: since },
      assetId: { not: null },
    },
    _count: { id: true },
  })

  const downloads = await prisma.analyticsEvent.groupBy({
    by: ["assetId"],
    where: {
      type: "ASSET_DOWNLOAD",
      createdAt: { gte: since },
      assetId: { not: null },
    },
    _count: { id: true },
  })

  const downloadMap = new Map(downloads.map((d) => [d.assetId, d._count.id]))

  // Combine and sort
  const assets = clicks
    .map((c) => ({
      assetId: c.assetId!,
      title: c.assetTitle || "Unknown",
      type: c.assetType || "ASSET",
      clicks: c._count.id,
      downloads: downloadMap.get(c.assetId) || 0,
    }))
    .sort((a, b) => b.clicks + b.downloads - (a.clicks + a.downloads))
    .slice(0, limit)

  return assets
}

/**
 * Get top search queries
 */
export async function getTopSearchQueries(range: string, limit = 10) {
  const since = getDateRange(range)

  const queries = await prisma.analyticsEvent.groupBy({
    by: ["searchQuery"],
    where: {
      type: "SEARCH_QUERY",
      createdAt: { gte: since },
      searchQuery: { not: null },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  })

  return queries.map((q) => ({
    query: q.searchQuery!,
    count: q._count.id,
  }))
}

// ===========================================================================
// Per-user drill-down helpers
// ===========================================================================

/**
 * Resolve the profile of an analytics user (the User row).
 * Returns null if the user no longer exists (e.g., account deleted).
 */
export async function getAnalyticsUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })
  if (!user) return null

  const domain = user.email.split("@")[1] || "unknown"
  // Enrich with companyName if the domain is in AllowedDomain
  const allowedDomain = await prisma.allowedDomain.findUnique({
    where: { domain },
    select: { companyName: true },
  })

  return {
    ...user,
    domain,
    companyName: allowedDomain?.companyName ?? null,
  }
}

/**
 * Per-user summary: totals for the 4 event types + first/last seen.
 */
export async function getUserEventsSummary(userId: string, range: string) {
  const since = getDateRange(range)
  const where = { userId, createdAt: { gte: since } }

  const [pageViews, assetClicks, assetDownloads, searches, firstSeen, lastSeen] =
    await Promise.all([
      prisma.analyticsEvent.count({ where: { ...where, type: "PAGE_VIEW" } }),
      prisma.analyticsEvent.count({ where: { ...where, type: "ASSET_CLICK" } }),
      prisma.analyticsEvent.count({ where: { ...where, type: "ASSET_DOWNLOAD" } }),
      prisma.analyticsEvent.count({ where: { ...where, type: "SEARCH_QUERY" } }),
      prisma.analyticsEvent.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.analyticsEvent.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ])

  return {
    pageViews,
    assetClicks,
    assetDownloads,
    searches,
    firstSeen: firstSeen?.createdAt ?? null,
    lastSeen: lastSeen?.createdAt ?? null,
  }
}

/**
 * Per-user time series: daily bucket counts for a given event type.
 * Fills missing dates with 0 so the chart renders gaps correctly.
 */
export async function getUserEventsOverTime(
  userId: string,
  range: string,
  type: AnalyticsEventType
) {
  const since = getDateRange(range)

  const events = await prisma.analyticsEvent.findMany({
    where: { userId, type, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  const grouped = events.reduce<Record<string, number>>((acc, event) => {
    const date = event.createdAt.toISOString().split("T")[0]
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {})

  const result: { date: string; count: number }[] = []
  const current = new Date(since)
  const end = new Date()
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0]
    result.push({ date: dateStr, count: grouped[dateStr] || 0 })
    current.setDate(current.getDate() + 1)
  }
  return result
}

/**
 * Per-user top assets: assets they clicked or downloaded, sorted by total action.
 */
export async function getUserTopAssets(
  userId: string,
  range: string,
  limit = 10
) {
  const since = getDateRange(range)

  const [clicks, downloads] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["assetId", "assetTitle", "assetType"],
      where: {
        userId,
        type: "ASSET_CLICK",
        createdAt: { gte: since },
        assetId: { not: null },
      },
      _count: { id: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["assetId", "assetTitle", "assetType"],
      where: {
        userId,
        type: "ASSET_DOWNLOAD",
        createdAt: { gte: since },
        assetId: { not: null },
      },
      _count: { id: true },
    }),
  ])

  // Merge by assetId, preferring download title if click title is missing.
  const merged = new Map<
    string,
    { assetId: string; title: string; type: string; clicks: number; downloads: number }
  >()
  for (const c of clicks) {
    const id = c.assetId!
    merged.set(id, {
      assetId: id,
      title: c.assetTitle || "Unknown",
      type: c.assetType || "ASSET",
      clicks: c._count.id,
      downloads: 0,
    })
  }
  for (const d of downloads) {
    const id = d.assetId!
    const existing = merged.get(id)
    if (existing) {
      existing.downloads = d._count.id
    } else {
      merged.set(id, {
        assetId: id,
        title: d.assetTitle || "Unknown",
        type: d.assetType || "ASSET",
        clicks: 0,
        downloads: d._count.id,
      })
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.clicks + b.downloads - (a.clicks + a.downloads))
    .slice(0, limit)
}

/**
 * Per-user recent event feed. Returns raw events for display (newest first).
 */
export async function getUserRecentEvents(
  userId: string,
  range: string,
  limit = 50
) {
  const since = getDateRange(range)
  return prisma.analyticsEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      pagePath: true,
      assetId: true,
      assetTitle: true,
      assetType: true,
      assetLanguage: true,
      searchQuery: true,
      createdAt: true,
    },
  })
}
