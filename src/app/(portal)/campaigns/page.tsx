"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { AssetInfoDrawer } from "@/components/portal/AssetInfoDrawer"
import { Mail, ExternalLink, Calendar } from "lucide-react"
import { useCampaigns } from "@/lib/swr"
import { cn, getDateStatus } from "@/lib/utils"
import { PinnedBadge } from "@/components/portal/PinnedBadge"
import { useAnalytics } from "@/hooks/useAnalytics"
import Image from "next/image"

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

export default function CampaignsPage() {
  const { data, isLoading, error } = useCampaigns()
  const campaigns = data?.assets || []
  const searchParams = useSearchParams()
  const router = useRouter()
  const { trackAssetDownload } = useAnalytics()

  const [selectedAsset, setSelectedAsset] = useState<AssetInfo | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleInfoClick = useCallback((campaign: any) => {
    const asset: AssetInfo = {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      type: "CAMPAIGN",
      category: "campaign",
      thumbnailUrl: campaign.thumbnailUrl,
      fileUrl: campaign.fileUrl,
      externalLink: campaign.externalLink || campaign.campaignLink,
      language: campaign.language,
      persona: campaign.persona,
      campaignGoal: campaign.campaignGoal,
      sentAt: campaign.sentAt,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    }
    setSelectedAsset(asset)
    setDrawerOpen(true)
    // Update URL for deep linking
    const url = new URL(window.location.href)
    url.searchParams.set("asset", campaign.id)
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
    if (assetId && campaigns.length > 0) {
      const found = campaigns.find((campaign: any) => campaign.id === assetId)
      if (found) {
        handleInfoClick(found)
      }
    }
  }, [searchParams, campaigns, handleInfoClick])

  const handleDownload = (campaign: any) => {
    trackAssetDownload(campaign.id, campaign.title, "CAMPAIGN")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns & Emails"
        description="Email templates and campaign materials"
      />

      {isLoading ? (
        <CampaignsLoading />
      ) : error ? (
        <Card padding="lg" className="text-center">
          <p className="text-red-500">Failed to load campaigns</p>
        </Card>
      ) : campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign: any) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onInfoClick={handleInfoClick}
              onDownload={handleDownload}
            />
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No campaigns available yet</p>
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

function CampaignCard({
  campaign,
  onInfoClick,
  onDownload,
}: {
  campaign: any
  onInfoClick: (campaign: any) => void
  onDownload: (campaign: any) => void
}) {
  const dateStatus = getDateStatus(campaign.sentAt)
  const formattedDate = campaign.sentAt
    ? new Date(campaign.sentAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <Card
      hover
      padding="none"
      className="overflow-hidden flex flex-col group relative cursor-pointer"
      onClick={() => onInfoClick(campaign)}
    >
      {/* Pinned Badge */}
      {campaign.isPinned && (
        <div className="absolute top-2 left-2 z-10">
          <PinnedBadge />
        </div>
      )}
      {/* Thumbnail */}
      <div className="aspect-[16/10] bg-gray-100 relative">
        {campaign.thumbnailUrl ? (
          <Image
            src={campaign.thumbnailUrl}
            alt={campaign.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Mail className="w-12 h-12 text-gray-300" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 line-clamp-1">
          {campaign.title}
        </h3>

        {campaign.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {campaign.description}
          </p>
        )}

        {/* Date Pill */}
        {formattedDate && dateStatus && (
          <div className="mt-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white",
                dateStatus === "past" ? "bg-gray-700" : "bg-primary"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              {dateStatus === "past" ? "Sent" : "Scheduled"}: {formattedDate}
            </span>
          </div>
        )}

        {/* Languages */}
        {campaign.language?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {campaign.language.map((l: string) => (
              <StatusBadge key={l} status="info">
                {l}
              </StatusBadge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-auto pt-4 flex-wrap">
          {campaign.fileUrl && (
            <a
              href={campaign.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                onDownload(campaign)
              }}
            >
              <Mail className="w-4 h-4" />
              View Email
            </a>
          )}
          {campaign.externalLink && (
            <a
              href={campaign.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
              Open Link
            </a>
          )}
          {campaign.campaignLink && (
            <a
              href={campaign.campaignLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
              View Campaign
            </a>
          )}
        </div>
      </div>
    </Card>
  )
}

function CampaignsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} padding="none" className="overflow-hidden">
          <div className="aspect-[16/10] bg-gray-200 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
          </div>
        </Card>
      ))}
    </div>
  )
}
