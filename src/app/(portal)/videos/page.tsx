"use client"

import { useMemo, useCallback, useState } from "react"
import Image from "next/image"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { AssetInfoDrawer } from "@/components/portal/AssetInfoDrawer"
import { GridSkeleton } from "@/components/portal/GridSkeleton"
import { LanguageFilter } from "@/components/portal/LanguageFilter"
import { Play, ExternalLink } from "lucide-react"
import { useVideos } from "@/lib/swr"
import { useAnalytics } from "@/hooks/useAnalytics"
import { useAssetDrawer } from "@/hooks/useAssetDrawer"
import { PinnedBadge } from "@/components/portal/PinnedBadge"
import { getYouTubeId, getYouTubeThumbnail } from "@/lib/utils"
import type { AssetInfo } from "@/types"

export default function VideosPage() {
  const { data, isLoading, error } = useVideos()
  const allVideos = useMemo(() => data?.assets || [], [data])
  const { trackAssetClick } = useAnalytics()

  const [languageFilter, setLanguageFilter] = useState<string | null>(null)

  const allLanguages = useMemo(() => {
    const set = new Set<string>()
    for (const a of allVideos) {
      for (const l of a.availableLanguages || []) set.add(l)
    }
    return Array.from(set)
  }, [allVideos])

  const videos = useMemo(() => {
    if (!languageFilter) return allVideos
    return allVideos.filter((a: any) =>
      (a.availableLanguages || []).includes(languageFilter)
    )
  }, [allVideos, languageFilter])

  const transformVideo = useCallback((video: any): AssetInfo => ({
    id: video.id,
    title: video.title,
    description: video.description,
    type: "VIDEO",
    category: "video",
    thumbnailUrl: video.thumbnailUrl || getYouTubeThumbnail(video.externalLink),
    fileUrl: video.fileUrl,
    externalLink: video.externalLink,
    availableLanguages: video.availableLanguages,
    persona: video.persona,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  }), [])

  const { selectedAsset, drawerOpen, handleInfoClick, handleDrawerClose } =
    useAssetDrawer(videos, transformVideo)

  const handleVideoClick = (video: any) => {
    trackAssetClick(video.id, video.title, "VIDEO")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Videos"
        description="Training videos and product demonstrations"
      />

      <LanguageFilter
        availableLanguages={allLanguages}
        activeLanguage={languageFilter}
        onChange={setLanguageFilter}
      />

      {isLoading ? (
        <GridSkeleton cardPadding="none" roundedThumbnail={false} />
      ) : error ? (
        <Card padding="lg" className="text-center">
          <p className="text-red-500">Failed to load videos</p>
        </Card>
      ) : videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video: any) => {
            const youtubeId = getYouTubeId(video.externalLink)
            const thumbnailUrl = video.thumbnailUrl || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null)
            const videoUrl = video.externalLink || video.fileUrl

            return (
              <Card
                key={video.id}
                hover
                padding="none"
                className="overflow-hidden group relative cursor-pointer"
                onClick={() => handleInfoClick(video)}
              >
                {video.isPinned && (
                  <div className="absolute top-2 left-2 z-20">
                    <PinnedBadge />
                  </div>
                )}
                <div className="relative aspect-video bg-gray-900">
                  {thumbnailUrl ? (
                    <Image
                      src={thumbnailUrl}
                      alt={video.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                      placeholder={video.blurDataUrl ? "blur" : undefined}
                      blurDataURL={video.blurDataUrl || undefined}
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Play className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                  {videoUrl && (
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleVideoClick(video)
                      }}
                    >
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" />
                      </div>
                    </a>
                  )}
                  {video.externalLink && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
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
                  {video.availableLanguages?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {video.availableLanguages.map((l: string) => (
                        <StatusBadge key={l} status="info">
                          {l}
                        </StatusBadge>
                      ))}
                    </div>
                  )}
                </div>
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

      <AssetInfoDrawer
        asset={selectedAsset}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />
    </div>
  )
}
