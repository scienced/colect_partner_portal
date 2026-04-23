"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface DomainRow {
  domain: string
  companyName: string | null
  count: number
}

interface DomainsResponse {
  domains: DomainRow[]
  total: number
  limit: number
  skip: number
  range: string
}

const dateRanges = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "3m", label: "3 months" },
]

const PAGE_SIZE = 25

export function AllDomainsList() {
  const [range, setRange] = useState("7d")
  const [page, setPage] = useState(0)
  const [data, setData] = useState<DomainsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPage(0)
  }, [range])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const skip = page * PAGE_SIZE
        const res = await fetch(
          `/api/analytics/domains?range=${range}&limit=${PAGE_SIZE}&skip=${skip}`
        )
        if (!res.ok) throw new Error("Failed to load domains")
        const json: DomainsResponse = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [range, page])

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0
  const startIdx = page * PAGE_SIZE + 1
  const endIdx = Math.min(startIdx + PAGE_SIZE - 1, data?.total ?? 0)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Analytics
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Partner Domains</h1>
            <p className="text-gray-500">
              {data
                ? `${data.total.toLocaleString()} active ${
                    data.total === 1 ? "domain" : "domains"
                  } in the selected range`
                : "Loading…"}
            </p>
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                  <div className="h-3 w-64 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : data && data.domains.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {data.domains.map((d) => (
              <li
                key={d.domain}
                className="flex items-center gap-4 p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {d.companyName || d.domain}
                  </div>
                  {d.companyName && (
                    <div className="text-sm text-gray-500 truncate">{d.domain}</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-medium text-gray-900">
                    {d.count.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">events</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-12 text-center text-gray-500">
            No active domains in this range.
          </div>
        )}
      </div>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {startIdx}–{endIdx} of {data.total.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
