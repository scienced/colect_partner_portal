"use client"

import { useState, useEffect } from "react"
import { Eye, Users, Download, Search, Building2, User, FileText } from "lucide-react"
import { PageViewsChart } from "@/components/charts/PageViewsChart"
import { cn } from "@/lib/utils"

interface AnalyticsData {
  summary: {
    pageViews: number
    assetClicks: number
    assetDownloads: number
    searches: number
    uniqueUsers: number
  }
  pageViewsOverTime: { date: string; count: number }[]
  topDomains: { domain: string; companyName: string | null; count: number }[]
  topUsers: { userId: string; email: string; name: string | null; count: number }[]
  topAssets: { assetId: string; title: string; type: string; clicks: number; downloads: number }[]
  topSearchQueries: { query: string; count: number }[]
}

const dateRanges = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "3m", label: "3 months" },
]

export function AnalyticsDashboard() {
  const [range, setRange] = useState("7d")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/analytics?range=${range}`)
        if (!response.ok) {
          throw new Error("Failed to fetch analytics")
        }
        const json = await response.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [range])

  if (loading) {
    return <AnalyticsLoading />
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Track portal usage and engagement</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Page Views"
          value={data.summary.pageViews}
          icon={<Eye className="w-5 h-5" />}
          color="blue"
        />
        <SummaryCard
          label="Unique Users"
          value={data.summary.uniqueUsers}
          icon={<Users className="w-5 h-5" />}
          color="green"
        />
        <SummaryCard
          label="Downloads"
          value={data.summary.assetDownloads}
          icon={<Download className="w-5 h-5" />}
          color="purple"
        />
        <SummaryCard
          label="Searches"
          value={data.summary.searches}
          icon={<Search className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Page Views Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Page Views Over Time</h2>
        {data.pageViewsOverTime.length > 0 ? (
          <PageViewsChart data={data.pageViewsOverTime} />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No data available for this period
          </div>
        )}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Domains */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Top Partner Domains</h2>
          </div>
          {data.topDomains.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-2 font-medium">Domain</th>
                  <th className="pb-2 font-medium text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {data.topDomains.map((domain, i) => (
                  <tr key={domain.domain} className="border-b border-gray-100 last:border-0">
                    <td className="py-3">
                      <div className="font-medium text-gray-900">{domain.domain}</div>
                      {domain.companyName && (
                        <div className="text-sm text-gray-500">{domain.companyName}</div>
                      )}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900">{domain.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-500">No data available</div>
          )}
        </div>

        {/* Top Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Top Users</h2>
          </div>
          {data.topUsers.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium text-right">Activity</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((user) => (
                  <tr key={user.userId} className="border-b border-gray-100 last:border-0">
                    <td className="py-3">
                      <div className="font-medium text-gray-900">{user.name || user.email}</div>
                      {user.name && (
                        <div className="text-sm text-gray-500">{user.email}</div>
                      )}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900">{user.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-500">No data available</div>
          )}
        </div>
      </div>

      {/* Top Assets Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Top Documents & Links</h2>
        </div>
        {data.topAssets.length > 0 ? (
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
              {data.topAssets.map((asset) => (
                <tr key={asset.assetId} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 font-medium text-gray-900">{asset.title}</td>
                  <td className="py-3">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      {asset.type}
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-900">{asset.clicks}</td>
                  <td className="py-3 text-right text-gray-900">{asset.downloads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-gray-500">No data available</div>
        )}
      </div>

      {/* Top Search Queries */}
      {data.topSearchQueries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Top Search Queries</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.topSearchQueries.map((query) => (
              <span
                key={query.query}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
              >
                <span className="font-medium text-gray-900">{query.query}</span>
                <span className="text-gray-500">({query.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: "blue" | "green" | "purple" | "amber"
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
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-200 rounded mt-2" />
        </div>
        <div className="h-10 w-64 bg-gray-200 rounded-lg" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div>
                <div className="h-8 w-16 bg-gray-200 rounded" />
                <div className="h-4 w-20 bg-gray-200 rounded mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="h-[300px] bg-gray-100 rounded" />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-12 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
