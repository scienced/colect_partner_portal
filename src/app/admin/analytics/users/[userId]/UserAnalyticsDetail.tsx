"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Eye,
  MousePointerClick,
  Download,
  Search as SearchIcon,
  FileText,
  ExternalLink,
  Calendar,
  Clock,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { EventsOverTimeChart } from "@/components/charts/EventsOverTimeChart"
import { cn } from "@/lib/utils"

interface UserDetailResponse {
  profile: {
    id: string
    email: string
    name: string | null
    role: string
    createdAt: string
    domain: string
    companyName: string | null
  }
  summary: {
    pageViews: number
    assetClicks: number
    assetDownloads: number
    searches: number
    firstSeen: string | null
    lastSeen: string | null
  }
  pageViewsOverTime: { date: string; count: number }[]
  downloadsOverTime: { date: string; count: number }[]
  topAssets: {
    assetId: string
    title: string
    type: string
    clicks: number
    downloads: number
  }[]
  recentEvents: {
    id: string
    type: "PAGE_VIEW" | "ASSET_CLICK" | "ASSET_DOWNLOAD" | "SEARCH_QUERY"
    pagePath: string | null
    assetId: string | null
    assetTitle: string | null
    assetType: string | null
    assetLanguage: string | null
    searchQuery: string | null
    createdAt: string
  }[]
  range: string
}

const dateRanges = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "3m", label: "3 months" },
]

export function UserAnalyticsDetail({ userId }: { userId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialRange = searchParams.get("range") || "7d"
  const [range, setRange] = useState(initialRange)
  const [data, setData] = useState<UserDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Keep the URL in sync with the chosen range so the back button does the
  // right thing and the URL is shareable.
  useEffect(() => {
    const current = searchParams.get("range") || "7d"
    if (current !== range) {
      const url = new URL(window.location.href)
      url.searchParams.set("range", range)
      router.replace(url.pathname + url.search, { scroll: false })
    }
  }, [range, router, searchParams])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      setNotFound(false)
      try {
        const res = await fetch(`/api/analytics/users/${userId}?range=${range}`)
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (!res.ok) throw new Error("Failed to load user analytics")
        const json: UserDetailResponse = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId, range])

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/analytics/users"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all users
        </Link>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          User not found. They may have been removed from the system.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/analytics/users"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all users
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xl flex-shrink-0">
              {(data?.profile.name || data?.profile.email || "?").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {data?.profile.name || data?.profile.email || "Loading…"}
              </h1>
              <p className="text-gray-500">
                {data?.profile.email}
                {data?.profile.companyName && (
                  <span className="text-gray-400"> · {data.profile.companyName}</span>
                )}
                {!data?.profile.companyName && data?.profile.domain && (
                  <span className="text-gray-400"> · {data.profile.domain}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {dateRanges.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  range === r.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Page Views"
          value={data?.summary.pageViews}
          icon={<Eye className="w-5 h-5" />}
          color="blue"
          loading={loading}
        />
        <SummaryCard
          label="Clicks"
          value={data?.summary.assetClicks}
          icon={<MousePointerClick className="w-5 h-5" />}
          color="green"
          loading={loading}
        />
        <SummaryCard
          label="Downloads"
          value={data?.summary.assetDownloads}
          icon={<Download className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
        <SummaryCard
          label="Searches"
          value={data?.summary.searches}
          icon={<SearchIcon className="w-5 h-5" />}
          color="amber"
          loading={loading}
        />
      </div>

      {/* First/Last seen */}
      {data && (data.summary.firstSeen || data.summary.lastSeen) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-6 flex-wrap text-sm">
          {data.summary.firstSeen && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>
                First seen:{" "}
                <span className="font-medium text-gray-900">
                  {format(new Date(data.summary.firstSeen), "MMM d, yyyy")}
                </span>
              </span>
            </div>
          )}
          {data.summary.lastSeen && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>
                Last active:{" "}
                <span className="font-medium text-gray-900">
                  {formatDistanceToNow(new Date(data.summary.lastSeen), {
                    addSuffix: true,
                  })}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Charts: Page views + Downloads, stacked */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Page Views Over Time
          </h2>
          {loading ? (
            <div className="h-[260px] bg-gray-50 animate-pulse rounded" />
          ) : data && data.pageViewsOverTime.length > 0 ? (
            <EventsOverTimeChart
              data={data.pageViewsOverTime}
              label="Page Views"
              color="#6366f1"
            />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-500">
              No page views in this period
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Downloads Over Time
          </h2>
          {loading ? (
            <div className="h-[260px] bg-gray-50 animate-pulse rounded" />
          ) : data && data.downloadsOverTime.length > 0 ? (
            <EventsOverTimeChart
              data={data.downloadsOverTime}
              label="Downloads"
              color="#9333ea"
            />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-500">
              No downloads in this period
            </div>
          )}
        </div>
      </div>

      {/* Top Assets for this user */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">
            Top Documents & Links
          </h2>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-50 animate-pulse rounded" />
            ))}
          </div>
        ) : data && data.topAssets.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-2 font-medium">Asset</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium text-right">Clicks</th>
                <th className="pb-2 font-medium text-right">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {data.topAssets.map((a) => (
                <tr
                  key={a.assetId}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="py-3 font-medium text-gray-900">{a.title}</td>
                  <td className="py-3">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      {a.type}
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-900">{a.clicks}</td>
                  <td className="py-3 text-right text-gray-900">
                    {a.downloads}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No asset activity in this period
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-50 animate-pulse rounded" />
            ))}
          </div>
        ) : data && data.recentEvents.length > 0 ? (
          <ul className="divide-y divide-gray-100 -my-2">
            {data.recentEvents.map((ev) => (
              <li key={ev.id} className="py-2 flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 mt-0.5">
                  <EventIcon type={ev.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 truncate">
                    <EventDescription event={ev} />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatDistanceToNow(new Date(ev.createdAt), {
                      addSuffix: true,
                    })}{" "}
                    · {format(new Date(ev.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No events in this period
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon,
  color,
  loading,
}: {
  label: string
  value: number | undefined
  icon: React.ReactNode
  color: "blue" | "green" | "purple" | "amber"
  loading: boolean
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>{icon}</div>
        <div>
          {loading ? (
            <div className="h-8 w-12 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">
              {(value ?? 0).toLocaleString()}
            </p>
          )}
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

function EventIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; className: string }> = {
    PAGE_VIEW: {
      icon: <Eye className="w-4 h-4" />,
      className: "text-blue-500 bg-blue-50",
    },
    ASSET_CLICK: {
      icon: <MousePointerClick className="w-4 h-4" />,
      className: "text-green-500 bg-green-50",
    },
    ASSET_DOWNLOAD: {
      icon: <Download className="w-4 h-4" />,
      className: "text-purple-500 bg-purple-50",
    },
    SEARCH_QUERY: {
      icon: <SearchIcon className="w-4 h-4" />,
      className: "text-amber-500 bg-amber-50",
    },
  }
  const { icon, className } = map[type] || {
    icon: <ExternalLink className="w-4 h-4" />,
    className: "text-gray-500 bg-gray-50",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-full",
        className
      )}
    >
      {icon}
    </span>
  )
}

function EventDescription({
  event,
}: {
  event: UserDetailResponse["recentEvents"][number]
}) {
  switch (event.type) {
    case "PAGE_VIEW":
      return (
        <>
          Viewed{" "}
          <span className="font-medium text-gray-700">
            {event.pagePath || "a page"}
          </span>
        </>
      )
    case "ASSET_CLICK":
      return (
        <>
          Opened{" "}
          <span className="font-medium text-gray-700">
            {event.assetTitle || "an asset"}
          </span>
          {event.assetLanguage && (
            <span className="text-gray-400"> ({event.assetLanguage})</span>
          )}
        </>
      )
    case "ASSET_DOWNLOAD":
      return (
        <>
          Downloaded{" "}
          <span className="font-medium text-gray-700">
            {event.assetTitle || "an asset"}
          </span>
          {event.assetLanguage && (
            <span className="text-gray-400"> ({event.assetLanguage})</span>
          )}
        </>
      )
    case "SEARCH_QUERY":
      return (
        <>
          Searched for{" "}
          <span className="font-medium text-gray-700">
            &ldquo;{event.searchQuery}&rdquo;
          </span>
        </>
      )
    default:
      return <span className="text-gray-500">Unknown event</span>
  }
}
