"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { AssetInfoDrawer } from "@/components/portal/AssetInfoDrawer"
import { FolderOpen, ExternalLink, Download, Info } from "lucide-react"
import { useGeneralAssets } from "@/lib/swr"
import { useAnalytics } from "@/hooks/useAnalytics"

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

export default function AssetsPage() {
  const { data, isLoading, error } = useGeneralAssets()
  const assets = data?.assets || []
  const searchParams = useSearchParams()
  const router = useRouter()
  const { trackAssetDownload, trackAssetClick } = useAnalytics()

  const [selectedAsset, setSelectedAsset] = useState<AssetInfo | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleInfoClick = useCallback((asset: any) => {
    const assetInfo: AssetInfo = {
      id: asset.id,
      title: asset.title,
      description: asset.description,
      type: "ASSET",
      category: "asset",
      thumbnailUrl: asset.thumbnailUrl,
      fileUrl: asset.fileUrl,
      externalLink: asset.externalLink,
      language: asset.language,
      persona: asset.persona,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    }
    setSelectedAsset(assetInfo)
    setDrawerOpen(true)
    // Update URL for deep linking
    const url = new URL(window.location.href)
    url.searchParams.set("asset", asset.id)
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
    if (assetId && assets.length > 0) {
      const found = assets.find((asset: any) => asset.id === assetId)
      if (found) {
        handleInfoClick(found)
      }
    }
  }, [searchParams, assets, handleInfoClick])

  const handleDownload = (asset: any) => {
    trackAssetDownload(asset.id, asset.title, "ASSET")
  }

  const handleExternalClick = (asset: any) => {
    trackAssetClick(asset.id, asset.title, "ASSET")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets & Links"
        description="Logos, marketing materials, and useful links"
      />

      {isLoading ? (
        <AssetsLoading />
      ) : error ? (
        <Card padding="lg" className="text-center">
          <p className="text-red-500">Failed to load assets</p>
        </Card>
      ) : assets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset: any) => (
            <Card key={asset.id} hover padding="md" className="group relative">
              <div className="flex flex-col h-full">
                {asset.thumbnailUrl ? (
                  <div className="aspect-video bg-gray-100 rounded-md mb-4 overflow-hidden relative">
                    <Image
                      src={asset.thumbnailUrl}
                      alt={asset.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-teal-500 to-teal-700 rounded-md mb-4 flex items-center justify-center">
                    <FolderOpen className="w-12 h-12 text-white/70" />
                  </div>
                )}
                <h3 className="font-medium text-gray-900">{asset.title}</h3>
                {asset.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {asset.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-auto pt-4">
                  {asset.fileUrl && (
                    <a
                      href={asset.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
                      onClick={() => handleDownload(asset)}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  )}
                  {asset.externalLink && (
                    <a
                      href={asset.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
                      onClick={() => handleExternalClick(asset)}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </a>
                  )}
                </div>
              </div>
              {/* Info Button */}
              <button
                onClick={() => handleInfoClick(asset)}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 text-gray-400 hover:text-primary hover:bg-white transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                title="View details"
              >
                <Info className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No assets available yet</p>
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

function AssetsLoading() {
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
