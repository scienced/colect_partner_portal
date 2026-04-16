"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useSearchParams, useRouter } from "next/navigation"
import { ContentRow, ContentItem } from "@/components/portal/ContentRow"
import { AssetInfoDrawer } from "@/components/portal/AssetInfoDrawer"
import { formatDistanceToNow } from "date-fns"
import { Sparkles, FileText, Play, Mail, ExternalLink, BookOpen, Star, Info } from "lucide-react"
import { useHomepageData } from "@/lib/swr"
import type { Asset, DocsUpdate, FeaturedItem } from "@/types"
import { getYouTubeThumbnail } from "@/lib/utils"

// Category colors for featured items
const categoryColors: Record<string, string> = {
  deck: "from-blue-500 to-blue-600",
  video: "from-red-500 to-red-600",
  campaign: "from-purple-500 to-purple-600",
  asset: "from-teal-500 to-teal-600",
  docs: "from-amber-500 to-amber-600",
}

// Category icons for featured items
const categoryIcons: Record<string, React.ReactNode> = {
  deck: <FileText className="w-6 h-6 text-white" />,
  video: <Play className="w-6 h-6 text-white" />,
  campaign: <Mail className="w-6 h-6 text-white" />,
  asset: <ExternalLink className="w-6 h-6 text-white" />,
  docs: <BookOpen className="w-6 h-6 text-white" />,
}

export default function HomePage() {
  const { data, isLoading, error } = useHomepageData()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedAsset, setSelectedAsset] = useState<ContentItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Input type for transformToContentItem - can be Asset, DocsUpdate, or merged item
  type TransformableItem = {
    id: string
    title: string
    type?: string
    description?: string | null
    summary?: string
    thumbnailUrl?: string | null
    fileUrl?: string | null
    externalLink?: string | null
    deepLink?: string
    campaignLink?: string | null
    availableLanguages?: string[]
    persona?: string[]
    campaignGoal?: string | null
    sentAt?: string | null
    createdAt?: string
    updatedAt?: string
    publishedAt?: string | null
    _type?: "asset" | "docs"
  }

  // Helper to transform raw data to ContentItem with all fields
  const transformToContentItem = useCallback((item: TransformableItem): ContentItem => {
    const category = item.type?.toLowerCase() || "asset"
    // Generate YouTube thumbnail for videos if no thumbnail is set
    const thumbnailUrl = item.thumbnailUrl ||
      (item.type === "VIDEO" ? getYouTubeThumbnail(item.externalLink) : undefined)
    // For campaigns, use externalLink or fallback to campaignLink
    const externalLink = item.externalLink || item.campaignLink || item.deepLink
    return {
      id: item.id,
      title: item.title,
      description: item.description || item.summary,
      thumbnailUrl,
      type: item.type,
      href: getAssetHref(item),
      external: shouldOpenExternal(item),
      fileUrl: item.fileUrl,
      externalLink,
      availableLanguages: item.availableLanguages,
      persona: item.persona,
      campaignGoal: item.campaignGoal,
      sentAt: item.sentAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      category: category as ContentItem["category"],
    }
  }, [])

  const handleInfoClick = useCallback((item: ContentItem) => {
    setSelectedAsset(item)
    setDrawerOpen(true)
    // Update URL without navigation
    const url = new URL(window.location.href)
    url.searchParams.set("asset", item.id)
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
    if (assetId && data) {
      // Find the asset across all collections
      const allItems: TransformableItem[] = [
        ...(data.decks || []),
        ...(data.videos || []),
        ...(data.campaigns || []),
        ...(data.assets || []),
        ...(data.docsUpdates || []).map((d) => ({
          ...d,
          type: "DOCS" as const,
          externalLink: d.deepLink,
        })),
        ...(data.recentlyUpdated || []),
      ]
      const found = allItems.find((item) => item.id === assetId)
      if (found) {
        handleInfoClick(transformToContentItem(found))
      }
    }
  }, [searchParams, data, handleInfoClick, transformToContentItem])

  if (isLoading) {
    return <HomepageLoading />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Failed to load homepage data</p>
      </div>
    )
  }

  const {
    featured = [],
    decks = [],
    videos = [],
    campaigns = [],
    assets = [],
    docsUpdates = [],
    recentlyUpdated = [],
  } = data || {}

  // Transform data for content rows
  const deckItems: ContentItem[] = decks.map((deck) => ({
    id: deck.id,
    title: deck.title,
    description: deck.description,
    thumbnailUrl: deck.thumbnailUrl,
    blurDataUrl: deck.blurDataUrl,
    type: "DECK",
    href: deck.fileUrl || "/decks",
    external: !!deck.fileUrl,
    fileUrl: deck.fileUrl,
    externalLink: deck.externalLink,
    category: "deck" as const,
    availableLanguages: deck.availableLanguages,
    persona: deck.persona,
    createdAt: deck.createdAt,
    updatedAt: deck.updatedAt,
    isPinned: deck.isPinned,
  }))

  const videoItems: ContentItem[] = videos.map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl || getYouTubeThumbnail(video.externalLink),
    blurDataUrl: video.blurDataUrl,
    type: "VIDEO",
    href: video.externalLink || video.fileUrl || "/videos",
    external: true,
    fileUrl: video.fileUrl,
    externalLink: video.externalLink,
    category: "video" as const,
    availableLanguages: video.availableLanguages,
    persona: video.persona,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
    isPinned: video.isPinned,
  }))

  const campaignItems: ContentItem[] = campaigns.map((campaign) => ({
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    thumbnailUrl: campaign.thumbnailUrl,
    blurDataUrl: campaign.blurDataUrl,
    type: "CAMPAIGN",
    href: campaign.fileUrl || campaign.externalLink || campaign.campaignLink || "/campaigns",
    external: !!(campaign.fileUrl || campaign.externalLink || campaign.campaignLink),
    fileUrl: campaign.fileUrl,
    externalLink: campaign.externalLink || campaign.campaignLink,
    // Don't set meta for campaigns - date is shown in the date pill
    category: "campaign" as const,
    availableLanguages: campaign.availableLanguages,
    persona: campaign.persona,
    campaignGoal: campaign.campaignGoal,
    sentAt: campaign.sentAt,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    isPinned: campaign.isPinned,
  }))

  const assetItems: ContentItem[] = assets.map((asset) => ({
    id: asset.id,
    title: asset.title,
    description: asset.description,
    thumbnailUrl: asset.thumbnailUrl,
    blurDataUrl: asset.blurDataUrl,
    type: "ASSET",
    href: asset.externalLink || asset.fileUrl || "/assets",
    external: !!(asset.externalLink || asset.fileUrl),
    fileUrl: asset.fileUrl,
    externalLink: asset.externalLink,
    category: "asset" as const,
    availableLanguages: asset.availableLanguages,
    persona: asset.persona,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    isPinned: asset.isPinned,
  }))

  const docsItems: ContentItem[] = docsUpdates.map((doc) => ({
    id: doc.id,
    title: doc.title,
    description: doc.summary,
    type: "DOCS",
    href: doc.deepLink,
    external: true,
    externalLink: doc.deepLink,
    meta: doc.publishedAt ? formatDistanceToNow(new Date(doc.publishedAt), { addSuffix: true }) : undefined,
    category: "docs" as const,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    isPinned: doc.isPinned,
  }))

  const recentItems: ContentItem[] = recentlyUpdated.map((item) => {
    const isNew = Math.abs(new Date(item.createdAt).getTime() - new Date(item.updatedAt).getTime()) < 60000
    // Generate YouTube thumbnail for videos if no thumbnail is set
    const thumbnailUrl = item.thumbnailUrl ||
      (item.type === "VIDEO" ? getYouTubeThumbnail(item.externalLink) : undefined)
    // For campaigns, use externalLink or fallback to campaignLink
    const externalLink = item.externalLink || (item as any).campaignLink || undefined
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      thumbnailUrl,
      blurDataUrl: item.blurDataUrl,
      type: item.type,
      href: getAssetHref(item),
      external: shouldOpenExternal(item),
      fileUrl: item.fileUrl,
      externalLink,
      meta: formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true }),
      category: item.type?.toLowerCase() as ContentItem["category"],
      status: isNew ? "new" as const : "updated" as const,
      availableLanguages: item.availableLanguages,
      persona: item.persona,
      campaignGoal: item.campaignGoal,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      isPinned: item.isPinned,
    }
  })

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      {featured.length > 0 && (
        <div className="-m-6 mb-6 bg-gradient-to-br from-primary/10 via-white to-blue-50 px-6 py-8 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Featured This Month</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="group relative bg-white hover:bg-gray-50 rounded-xl p-4 transition-all shadow-sm hover:shadow-md border border-gray-100"
              >
                <a
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="block"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-24 aspect-video rounded-lg bg-gradient-to-br ${categoryColors[item.category] || "from-primary to-primary/70"} flex items-center justify-center flex-shrink-0 overflow-hidden relative`}>
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt={`${item.title} thumbnail`}
                          fill
                          sizes="96px"
                          className="object-cover"
                          placeholder={item.asset?.blurDataUrl ? "blur" : undefined}
                          blurDataURL={item.asset?.blurDataUrl || undefined}
                          unoptimized
                        />
                      ) : (
                        categoryIcons[item.category] || (
                          <span className="text-white/90 text-2xl font-bold">
                            {item.title[0]}
                          </span>
                        )
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-primary font-medium uppercase tracking-wide">
                          {item.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          <Star className="w-3 h-3" fill="currentColor" />
                          Featured
                        </span>
                      </div>
                      <h3
                        className="font-semibold text-gray-900 mt-1 line-clamp-1 group-hover:text-primary transition-colors tooltip"
                        data-tooltip={item.title}
                      >
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
                {item.asset && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (item.asset) {
                        handleInfoClick(transformToContentItem(item.asset))
                      }
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`View details for ${item.title}`}
                  >
                    <Info className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Rows */}
      <div className="-mx-6 space-y-2 pb-8">
        <ContentRow
          title="Latest Sales Decks"
          viewAllHref="/decks"
          items={deckItems}
          variant="large"
          onInfoClick={handleInfoClick}
        />

        {videoItems.length > 0 && (
          <ContentRow
            title="Videos"
            viewAllHref="/videos"
            items={videoItems}
            variant="large"
            onInfoClick={handleInfoClick}
          />
        )}

        {campaignItems.length > 0 && (
          <ContentRow
            title="Campaigns & Emails"
            viewAllHref="/campaigns"
            items={campaignItems}
            onInfoClick={handleInfoClick}
          />
        )}

        {docsItems.length > 0 && (
          <ContentRow
            title="Documentation Updates"
            viewAllHref="/docs-updates"
            items={docsItems}
            variant="docs"
            onInfoClick={handleInfoClick}
          />
        )}

        {assetItems.length > 0 && (
          <ContentRow
            title="Assets & Links"
            viewAllHref="/assets"
            items={assetItems}
            onInfoClick={handleInfoClick}
          />
        )}

        {recentItems.length > 0 && (
          <ContentRow
            title="Recently Updated"
            items={recentItems}
            onInfoClick={handleInfoClick}
          />
        )}
      </div>

      {/* Asset Info Drawer */}
      <AssetInfoDrawer
        asset={selectedAsset ? {
          id: selectedAsset.id,
          title: selectedAsset.title,
          description: selectedAsset.description,
          type: selectedAsset.type || selectedAsset.category?.toUpperCase() || "ASSET",
          category: selectedAsset.category,
          thumbnailUrl: selectedAsset.thumbnailUrl ||
            ((selectedAsset.type === "VIDEO" || selectedAsset.category === "video")
              ? getYouTubeThumbnail(selectedAsset.externalLink || null)
              : undefined),
          fileUrl: selectedAsset.fileUrl,
          externalLink: selectedAsset.externalLink,
          availableLanguages: selectedAsset.availableLanguages,
          persona: selectedAsset.persona,
          campaignGoal: selectedAsset.campaignGoal,
          sentAt: selectedAsset.sentAt,
          createdAt: selectedAsset.createdAt || new Date().toISOString(),
          updatedAt: selectedAsset.updatedAt || new Date().toISOString(),
        } : null}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />
    </div>
  )
}

// Helper functions
function getAssetHref(asset: { type?: string; fileUrl?: string | null; externalLink?: string | null; campaignLink?: string | null }): string {
  switch (asset.type) {
    case "DECK":
      return asset.fileUrl || "/decks"
    case "VIDEO":
      return asset.externalLink || asset.fileUrl || "/videos"
    case "CAMPAIGN":
      return asset.fileUrl || asset.externalLink || asset.campaignLink || "/campaigns"
    case "ASSET":
      return asset.externalLink || asset.fileUrl || "/assets"
    case "DOCS":
      return asset.externalLink || "/docs-updates"
    default:
      return "/"
  }
}

function shouldOpenExternal(asset: { type?: string; fileUrl?: string | null; externalLink?: string | null; campaignLink?: string | null }): boolean {
  switch (asset.type) {
    case "DECK":
      return !!asset.fileUrl
    case "VIDEO":
      return !!(asset.externalLink || asset.fileUrl)
    case "CAMPAIGN":
      return !!(asset.fileUrl || asset.externalLink || asset.campaignLink)
    case "ASSET":
      return !!(asset.externalLink || asset.fileUrl)
    case "DOCS":
      return !!asset.externalLink
    default:
      return false
  }
}

function HomepageLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero Skeleton */}
      <div className="-m-6 mb-6 bg-gradient-to-br from-primary/10 via-white to-blue-50 px-6 py-8 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-start gap-4 animate-pulse">
                <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
                  <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-full bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Row Skeletons */}
      <div className="-mx-6 space-y-6 pb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex gap-4 overflow-hidden">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="w-72 flex-shrink-0 animate-pulse">
                  <div className="h-40 bg-gray-200 rounded-t-xl" />
                  <div className="p-3 bg-white rounded-b-xl shadow-sm">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
