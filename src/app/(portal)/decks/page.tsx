"use client"

import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import { useSearchParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { AssetInfoDrawer } from "@/components/portal/AssetInfoDrawer"
import { FileText, Download } from "lucide-react"
import { useDecks } from "@/lib/swr"
import { useAnalytics } from "@/hooks/useAnalytics"
import { PinnedBadge } from "@/components/portal/PinnedBadge"

interface AssetInfo {
  id: string
  title: string
  description?: string | null
  type: string
  category?: string
  thumbnailUrl?: string | null
  fileUrl?: string | null
  externalLink?: string | null
  language?: string[]
  persona?: string[]
  campaignGoal?: string | null
  sentAt?: string | null
  createdAt: string
  updatedAt: string
}

export default function DecksPage() {
  const { data, isLoading, error } = useDecks()
  const decks = data?.assets || []
  const searchParams = useSearchParams()
  const router = useRouter()
  const { trackAssetDownload } = useAnalytics()

  const [selectedAsset, setSelectedAsset] = useState<AssetInfo | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleInfoClick = useCallback((deck: any) => {
    const asset: AssetInfo = {
      id: deck.id,
      title: deck.title,
      description: deck.description,
      type: "DECK",
      category: "deck",
      thumbnailUrl: deck.thumbnailUrl,
      fileUrl: deck.fileUrl,
      externalLink: deck.externalLink,
      language: deck.language,
      persona: deck.persona,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    }
    setSelectedAsset(asset)
    setDrawerOpen(true)
    // Update URL for deep linking
    const url = new URL(window.location.href)
    url.searchParams.set("asset", deck.id)
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false)
    setSelectedAsset(null)
    // Remove asset param from URL
    const url = new URL(window.location.href)
    url.searchParams.delete("asset")
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

  // Handle deep linking via URL params
  useEffect(() => {
    const assetId = searchParams.get("asset")
    if (assetId && decks.length > 0) {
      const found = decks.find((deck: any) => deck.id === assetId)
      if (found) {
        handleInfoClick(found)
      }
    }
  }, [searchParams, decks, handleInfoClick])

  const handleDownload = (deck: any) => {
    trackAssetDownload(deck.id, deck.title, "DECK")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Decks"
        description="Browse and download sales presentations"
      />

      {isLoading ? (
        <DecksLoading />
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
              {/* Pinned Badge */}
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
                {deck.language?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {deck.language.map((l: string) => (
                      <StatusBadge key={l} status="info">
                        {l}
                      </StatusBadge>
                    ))}
                  </div>
                )}
                {deck.fileUrl && (
                  <a
                    href={deck.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(deck)
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                )}
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

      {/* Asset Info Drawer */}
      <AssetInfoDrawer
        asset={selectedAsset}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />
    </div>
  )
}

function DecksLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} padding="md">
          <div className="animate-pulse">
            <div className="aspect-video bg-gray-200 rounded-md mb-4" />
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </Card>
      ))}
    </div>
  )
}
