"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { ImageIcon, Megaphone } from "lucide-react"
import { fetcher } from "@/lib/swr"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { GridSkeleton } from "@/components/portal/GridSkeleton"
import { AudienceBadges } from "@/components/portal/AudienceBadges"
import { AdSetDrawer } from "@/components/portal/AdSetDrawer"
import { useAnalytics } from "@/hooks/useAnalytics"
import { cn } from "@/lib/utils"
import type { SerializedAdSet } from "@/lib/adSets"

const BRAND_FILTERS = [
  { value: "", label: "All" },
  { value: "COLECT", label: "Colect" },
  { value: "LE_NEW_BLACK", label: "Le New Black" },
] as const

export default function SocialAdsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [brand, setBrand] = useState("")
  const { data, isLoading, error } = useSWR<{ items: SerializedAdSet[] }>(
    `/api/portal/social-ads${brand ? `?brand=${brand}` : ""}`,
    fetcher
  )
  const items = useMemo(() => data?.items ?? [], [data])
  // Downloads are tracked server-side by the zip route.
  const { trackAssetClick } = useAnalytics()

  // The brand field only reaches employees; show its filter only then.
  const showBrandFilter = brand !== "" || items.some((i) => "visibility" in i)

  const selectedId = searchParams.get("asset")
  const selected = items.find((i) => i.id === selectedId) ?? null

  useEffect(() => {
    if (selected) trackAssetClick(selected.id, selected.title, "SOCIAL_AD")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  const openAdSet = (id: string | null) => {
    const url = new URL(window.location.href)
    if (id) url.searchParams.set("asset", id)
    else url.searchParams.delete("asset")
    router.replace(url.pathname + url.search, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Social Ads" description="LinkedIn ad sets: visuals and copy, ready to reuse" />

      {showBrandFilter && (
        <div className="flex gap-2">
          {BRAND_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setBrand(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm transition-colors",
                brand === f.value ? "bg-primary text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <GridSkeleton />
      ) : error ? (
        <Card padding="lg" className="text-center">
          <p className="text-red-500">Failed to load social ads</p>
        </Card>
      ) : items.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No ad sets here yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openAdSet(item.id)}
              className="text-left rounded-xl bg-white border border-gray-200 overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all group"
            >
              <div className="relative aspect-video bg-gray-100 flex items-center justify-center">
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-gray-300" />
                )}
                <span className="absolute top-2 left-2 text-xs font-medium px-2 py-1 rounded-md bg-black/60 text-white">
                  {item.media.length} visual{item.media.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1 mb-1 flex-wrap">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">LinkedIn</span>
                  <AudienceBadges visibility={item.visibility} brand={item.brand} />
                </div>
                <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-1">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {item.copies.length} copy version{item.copies.length === 1 ? "" : "s"}
                  {item.availableLanguages.length > 0 && ` · ${item.availableLanguages.join(", ")}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <AdSetDrawer
        adSet={selected}
        open={!!selected}
        onClose={() => openAdSet(null)}
      />
    </div>
  )
}
