"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { Building2, Download, Eye, Megaphone } from "lucide-react"
import { fetcher } from "@/lib/swr"
import { PageHeader, StatusBadge } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { GridSkeleton } from "@/components/portal/GridSkeleton"
import { LanguageFilter } from "@/components/portal/LanguageFilter"
import { AudienceBadges } from "@/components/portal/AudienceBadges"
import { AdSetDrawer } from "@/components/portal/AdSetDrawer"
import { useAnalytics } from "@/hooks/useAnalytics"
import { cn } from "@/lib/utils"
import type { SerializedAdSet } from "@/lib/adSets"
import { adPlatformLabel } from "@/lib/adPlatforms"

const BRAND_FILTERS = [
  { value: null, label: "All" },
  { value: "COLECT", label: "Colect" },
  { value: "LE_NEW_BLACK", label: "Le New Black" },
] as const

export default function AdsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data, isLoading, error } = useSWR<{ items: SerializedAdSet[] }>("/api/portal/ads", fetcher)
  const allAds = useMemo(() => data?.items ?? [], [data])
  // Downloads are tracked server-side by the zip route.
  const { trackAssetClick } = useAnalytics()

  const [languageFilter, setLanguageFilter] = useState<string | null>(null)
  const [brandFilter, setBrandFilter] = useState<string | null>(null)

  const allLanguages = useMemo(() => {
    const set = new Set<string>()
    for (const a of allAds) for (const l of a.availableLanguages) set.add(l)
    return Array.from(set)
  }, [allAds])
  // The brand tag only reaches employees; show its filter only then.
  const showBrandFilter = allAds.some((a) => "visibility" in a)

  const ads = useMemo(
    () =>
      allAds.filter(
        (a) =>
          (!languageFilter || a.availableLanguages.includes(languageFilter)) &&
          // "Colect" / "Le New Black" also include ads tagged for both.
          (!brandFilter || a.brand === brandFilter || a.brand === "BOTH")
      ),
    [allAds, languageFilter, brandFilter]
  )

  const selectedId = searchParams.get("asset")
  const selected = allAds.find((a) => a.id === selectedId) ?? null

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
      <PageHeader title="Ads" description="Ad campaigns: visuals and copy, ready to reuse" />

      {(allLanguages.length > 0 || showBrandFilter) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <LanguageFilter availableLanguages={allLanguages} activeLanguage={languageFilter} onChange={setLanguageFilter} />
          {showBrandFilter && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-1">For</span>
              {BRAND_FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setBrandFilter(f.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    brandFilter === f.value ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <GridSkeleton />
      ) : error ? (
        <Card padding="lg" className="text-center">
          <p className="text-red-500">Failed to load ads</p>
        </Card>
      ) : ads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => (
            <Card
              key={ad.id}
              hover
              padding="md"
              className="group relative cursor-pointer"
              onClick={() => openAdSet(ad.id)}
            >
              <div className="flex flex-col h-full">
                <div className="aspect-video bg-gray-100 rounded-md mb-4 overflow-hidden relative">
                  {ad.thumbnailUrl ? (
                    <Image
                      src={ad.thumbnailUrl}
                      alt={ad.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                      placeholder={ad.blurDataUrl ? "blur" : undefined}
                      blurDataURL={ad.blurDataUrl || undefined}
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center">
                      <Megaphone className="w-12 h-12 text-white/70" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 text-xs font-medium px-2 py-1 rounded-md bg-black/60 text-white">
                    {adPlatformLabel(ad.adPlatform)} · {ad.media.length} visual{ad.media.length === 1 ? "" : "s"}
                  </span>
                </div>
                <AudienceBadges visibility={ad.visibility} brand={ad.brand} className="mb-1" />
                <h3 className="font-medium text-gray-900">{ad.title}</h3>
                {ad.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ad.description}</p>}
                {ad.availableLanguages.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ad.availableLanguages.map((l) => (
                      <StatusBadge key={l} status="info">{l}</StatusBadge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-auto pt-4">
                  <a
                    href={`/api/portal/ads/${ad.id}/download`}
                    className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                  <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:underline">
                    <Eye className="w-4 h-4" />
                    View
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{allAds.length ? "No ads match these filters" : "No ads available yet"}</p>
        </Card>
      )}

      <AdSetDrawer adSet={selected} open={!!selected} onClose={() => openAdSet(null)} />
    </div>
  )
}
