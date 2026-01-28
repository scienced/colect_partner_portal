"use client"

import { useMemo, useCallback } from "react"
import Image from "next/image"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { AssetInfoDrawer } from "@/components/portal/AssetInfoDrawer"
import { GridSkeleton } from "@/components/portal/GridSkeleton"
import { FolderOpen, ExternalLink, Download } from "lucide-react"
import { useGeneralAssets } from "@/lib/swr"
import { useAnalytics } from "@/hooks/useAnalytics"
import { useAssetDrawer } from "@/hooks/useAssetDrawer"
import { PinnedBadge } from "@/components/portal/PinnedBadge"
import type { AssetInfo } from "@/types"

export default function AssetsPage() {
  const { data, isLoading, error } = useGeneralAssets()
  const assets = useMemo(() => data?.assets || [], [data])
  const { trackAssetDownload, trackAssetClick } = useAnalytics()

  const transformAsset = useCallback((asset: any): AssetInfo => ({
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
  }), [])

  const { selectedAsset, drawerOpen, handleInfoClick, handleDrawerClose } =
    useAssetDrawer(assets, transformAsset)

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
        <GridSkeleton />
      ) : error ? (
        <Card padding="lg" className="text-center">
          <p className="text-red-500">Failed to load assets</p>
        </Card>
      ) : assets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset: any) => (
            <Card
              key={asset.id}
              hover
              padding="md"
              className="group relative cursor-pointer"
              onClick={() => handleInfoClick(asset)}
            >
              {asset.isPinned && (
                <div className="absolute top-2 left-2 z-10">
                  <PinnedBadge />
                </div>
              )}
              <div className="flex flex-col h-full">
                {asset.thumbnailUrl ? (
                  <div className="aspect-video bg-gray-100 rounded-md mb-4 overflow-hidden relative">
                    <Image
                      src={asset.thumbnailUrl}
                      alt={asset.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                      placeholder={asset.blurDataUrl ? "blur" : undefined}
                      blurDataURL={asset.blurDataUrl || undefined}
                      unoptimized
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(asset)
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExternalClick(asset)
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No assets available yet</p>
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
