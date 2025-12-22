"use client"

import { ContentRow } from "@/components/portal/ContentRow"
import { formatDistanceToNow } from "date-fns"
import { Sparkles } from "lucide-react"
import { useHomepageData } from "@/lib/swr"

export default function HomePage() {
  const { data, isLoading, error } = useHomepageData()

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
  const deckItems = decks.map((deck: any) => ({
    id: deck.id,
    title: deck.title,
    description: deck.description,
    thumbnailUrl: deck.thumbnailUrl,
    href: deck.fileUrl || "/decks",
    external: !!deck.fileUrl,
    fileUrl: deck.fileUrl,
    meta: deck.language?.length > 0 ? deck.language.join(" / ") : undefined,
    category: "deck" as const,
  }))

  const videoItems = videos.map((video: any) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl || getYouTubeThumbnail(video.externalLink),
    href: video.externalLink || video.fileUrl || "/videos",
    external: true,
    meta: video.language?.length > 0 ? video.language.join(" / ") : undefined,
    category: "video" as const,
  }))

  const campaignItems = campaigns.map((campaign: any) => ({
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    thumbnailUrl: campaign.thumbnailUrl,
    href: campaign.campaignLink || "/campaigns",
    external: !!campaign.campaignLink,
    meta: campaign.campaignGoal || undefined,
    category: "campaign" as const,
  }))

  const assetItems = assets.map((asset: any) => ({
    id: asset.id,
    title: asset.title,
    description: asset.description,
    thumbnailUrl: asset.thumbnailUrl,
    href: asset.externalLink || asset.fileUrl || "/assets",
    external: !!(asset.externalLink || asset.fileUrl),
    category: "asset" as const,
  }))

  const docsItems = docsUpdates.map((doc: any) => ({
    id: doc.id,
    title: doc.title,
    description: doc.summary,
    href: doc.deepLink,
    external: true,
    meta: doc.publishedAt ? formatDistanceToNow(new Date(doc.publishedAt), { addSuffix: true }) : undefined,
    category: "docs" as const,
  }))

  const recentItems = recentlyUpdated.map((item: any) => {
    const isNew = Math.abs(new Date(item.createdAt).getTime() - new Date(item.updatedAt).getTime()) < 60000
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      thumbnailUrl: item.thumbnailUrl,
      href: getAssetHref(item),
      external: shouldOpenExternal(item),
      meta: formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true }),
      category: item.type.toLowerCase() as any,
      status: isNew ? "new" as const : "updated" as const,
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
            {featured.slice(0, 3).map((item: any) => (
              <a
                key={item.id}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="group bg-white hover:bg-gray-50 rounded-xl p-4 transition-all shadow-sm hover:shadow-md border border-gray-100"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-white/90 text-2xl font-bold">
                        {item.title[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-primary font-medium uppercase tracking-wide">
                      {item.category}
                    </span>
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
        />

        {videoItems.length > 0 && (
          <ContentRow
            title="Videos"
            viewAllHref="/videos"
            items={videoItems}
            variant="large"
          />
        )}

        {campaignItems.length > 0 && (
          <ContentRow
            title="Campaigns & Emails"
            viewAllHref="/campaigns"
            items={campaignItems}
          />
        )}

        {docsItems.length > 0 && (
          <ContentRow
            title="Documentation Updates"
            viewAllHref="/docs-updates"
            items={docsItems}
            variant="docs"
          />
        )}

        {assetItems.length > 0 && (
          <ContentRow
            title="Assets & Links"
            viewAllHref="/assets"
            items={assetItems}
          />
        )}

        {recentItems.length > 0 && (
          <ContentRow
            title="Recently Updated"
            items={recentItems}
          />
        )}
      </div>
    </div>
  )
}

// Helper functions
function getYouTubeThumbnail(url: string | null): string | undefined {
  if (!url) return undefined
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
    }
  }
  return undefined
}

function getAssetHref(asset: { type: string; fileUrl: string | null; externalLink: string | null; campaignLink: string | null }): string {
  switch (asset.type) {
    case "DECK":
      return asset.fileUrl || "/decks"
    case "VIDEO":
      return asset.externalLink || asset.fileUrl || "/videos"
    case "CAMPAIGN":
      return asset.campaignLink || "/campaigns"
    case "ASSET":
      return asset.externalLink || asset.fileUrl || "/assets"
    default:
      return "/"
  }
}

function shouldOpenExternal(asset: { type: string; fileUrl: string | null; externalLink: string | null; campaignLink: string | null }): boolean {
  switch (asset.type) {
    case "DECK":
      return !!asset.fileUrl
    case "VIDEO":
      return !!(asset.externalLink || asset.fileUrl)
    case "CAMPAIGN":
      return !!asset.campaignLink
    case "ASSET":
      return !!(asset.externalLink || asset.fileUrl)
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
