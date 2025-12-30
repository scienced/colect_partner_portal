"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { AssetInfoDrawer } from "@/components/portal/AssetInfoDrawer"
import { Play, ExternalLink, Info } from "lucide-react"
import { useVideos } from "@/lib/swr"
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

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}

export default function VideosPage() {
  const { data, isLoading, error } = useVideos()
  const videos = data?.assets || []
  const searchParams = useSearchParams()
  const router = useRouter()
  const { trackAssetClick } = useAnalytics()

  const [selectedAsset, setSelectedAsset] = useState<AssetInfo | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleInfoClick = useCallback((video: any) => {
    const youtubeId = video.externalLink ? getYouTubeId(video.externalLink) : null
    const thumbnailUrl = video.thumbnailUrl || (youtubeId ? getYouTubeThumbnail(youtubeId) : null)

    const asset: AssetInfo = {
      id: video.id,
      title: video.title,
      description: video.description,
      type: "VIDEO",
      category: "video",
      thumbnailUrl: thumbnailUrl,
      fileUrl: video.fileUrl,
      externalLink: video.externalLink,
      language: video.language,
      persona: video.persona,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    }
    setSelectedAsset(asset)
    setDrawerOpen(true)
    // Update URL for deep linking
    const url = new URL(window.location.href)
    url.searchParams.set("asset", video.id)
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
    if (assetId && videos.length > 0) {
      const found = videos.find((video: any) => video.id === assetId)
      if (found) {
        handleInfoClick(found)
      }
    }
  }, [searchParams, videos, handleInfoClick])

  const handleVideoClick = (video: any) => {
    trackAssetClick(video.id, video.title, "VIDEO")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Videos"
        description="Training videos and product demonstrations"
      />

      {isLoading ? (
        <VideosLoading />
      ) : error ? (
        <Card padding="lg" className="text-center">
          <p className="text-red-500">Failed to load videos</p>
        </Card>
      ) : videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video: any) => {
            const youtubeId = video.externalLink ? getYouTubeId(video.externalLink) : null
            const thumbnailUrl = video.thumbnailUrl || (youtubeId ? getYouTubeThumbnail(youtubeId) : null)
            const videoUrl = video.externalLink || video.fileUrl

            return (
              <Card key={video.id} hover padding="none" className="overflow-hidden group relative">
                <a
                  href={videoUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  onClick={() => handleVideoClick(video)}
                >
                  <div className="relative aspect-video bg-gray-900">
                    {thumbnailUrl ? (
                      <Image
                        src={thumbnailUrl}
                        alt={video.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <Play className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" />
                      </div>
                    </div>
                    {video.externalLink && (
                      <div className="absolute top-2 right-10 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {youtubeId ? "YouTube" : "External"}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 line-clamp-1">{video.title}</h3>
                    {video.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                    {video.language?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {video.language.map((l: string) => (
                          <StatusBadge key={l} status="info">
                            {l}
                          </StatusBadge>
                        ))}
                      </div>
                    )}
                  </div>
                </a>
                {/* Info Button */}
                <button
                  onClick={() => handleInfoClick(video)}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 text-gray-400 hover:text-primary hover:bg-white transition-colors opacity-0 group-hover:opacity-100 shadow-sm z-10"
                  title="View details"
                >
                  <Info className="w-4 h-4" />
                </button>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <Play className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No videos available yet</p>
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

function VideosLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} padding="none" className="overflow-hidden">
          <div className="animate-pulse">
            <div className="aspect-video bg-gray-200" />
            <div className="p-4">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
