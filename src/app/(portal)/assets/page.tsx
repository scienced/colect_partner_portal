"use client"

import Image from "next/image"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { FolderOpen, ExternalLink, Download } from "lucide-react"
import { useGeneralAssets } from "@/lib/swr"

export default function AssetsPage() {
  const { data, isLoading, error } = useGeneralAssets()
  const assets = data?.assets || []

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
            <Card key={asset.id} hover padding="md">
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
