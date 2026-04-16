"use client"

import { useMemo, useCallback, useState } from "react"
import Image from "next/image"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { AssetInfoDrawer } from "@/components/portal/AssetInfoDrawer"
import { GridSkeleton } from "@/components/portal/GridSkeleton"
import { LanguageFilter } from "@/components/portal/LanguageFilter"
import { FileText, Download, ExternalLink } from "lucide-react"
import { useDecks } from "@/lib/swr"
import { useAnalytics } from "@/hooks/useAnalytics"
import { useAssetDrawer } from "@/hooks/useAssetDrawer"
import { PinnedBadge } from "@/components/portal/PinnedBadge"
import type { AssetInfo } from "@/types"

export default function DecksPage() {
  const { data, isLoading, error } = useDecks()
  const allDecks = useMemo(() => data?.assets || [], [data])
  const { trackAssetDownload } = useAnalytics()

  const [languageFilter, setLanguageFilter] = useState<string | null>(null)

  const allLanguages = useMemo(() => {
    const set = new Set<string>()
    for (const a of allDecks) {
      for (const l of a.availableLanguages || []) set.add(l)
    }
    return Array.from(set)
  }, [allDecks])

  const decks = useMemo(() => {
    if (!languageFilter) return allDecks
    return allDecks.filter((a: any) =>
      (a.availableLanguages || []).includes(languageFilter)
    )
  }, [allDecks, languageFilter])

  const transformDeck = useCallback((deck: any): AssetInfo => ({
    id: deck.id,
    title: deck.title,
    description: deck.description,
    type: "DECK",
    category: "deck",
    thumbnailUrl: deck.thumbnailUrl,
    fileUrl: deck.fileUrl,
    externalLink: deck.externalLink,
    availableLanguages: deck.availableLanguages,
    persona: deck.persona,
    createdAt: deck.createdAt,
    updatedAt: deck.updatedAt,
  }), [])

  const { selectedAsset, drawerOpen, handleInfoClick, handleDrawerClose } =
    useAssetDrawer(decks, transformDeck)

  const handleDownload = (deck: any) => {
    trackAssetDownload(deck.id, deck.title, "DECK")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Decks"
        description="Browse and download sales presentations"
      />

      <LanguageFilter
        availableLanguages={allLanguages}
        activeLanguage={languageFilter}
        onChange={setLanguageFilter}
      />

      {isLoading ? (
        <GridSkeleton />
      ) : error ? (
        <Card padding="lg" className="text-center">
          <p className="text-red-500">Failed to load decks</p>
        </Card>
      ) : decks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck: any) => (
            <Card
              key={deck.id}
              hover
              padding="md"
              className="group relative cursor-pointer"
              onClick={() => handleInfoClick(deck)}
            >
              {deck.isPinned && (
                <div className="absolute top-2 left-2 z-10">
                  <PinnedBadge />
                </div>
              )}
              <div className="flex flex-col h-full">
                {deck.thumbnailUrl ? (
                  <div className="aspect-video bg-gray-100 rounded-md mb-4 overflow-hidden relative">
                    <Image
                      src={deck.thumbnailUrl}
                      alt={deck.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                      placeholder={deck.blurDataUrl ? "blur" : undefined}
                      blurDataURL={deck.blurDataUrl || undefined}
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-md mb-4 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <h3 className="font-medium text-gray-900">{deck.title}</h3>
                {deck.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {deck.description}
                  </p>
                )}
                {deck.availableLanguages?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {deck.availableLanguages.map((l: string) => (
                      <StatusBadge key={l} status="info">
                        {l}
                      </StatusBadge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-auto pt-4 flex-wrap">
                  {deck.fileUrl && (
                    <a
                      href={deck.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(deck)
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  )}
                  {deck.externalLink && (
                    <a
                      href={deck.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Slides
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No sales decks available yet</p>
        </Card>
      )}

      <AssetInfoDrawer
        asset={selectedAsset}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />
    </div>
  )
}
