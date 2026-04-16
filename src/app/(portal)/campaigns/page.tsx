"use client"

import { useMemo, useCallback, useState } from "react"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { AssetInfoDrawer } from "@/components/portal/AssetInfoDrawer"
import { GridSkeleton } from "@/components/portal/GridSkeleton"
import { LanguageFilter } from "@/components/portal/LanguageFilter"
import { Mail, ExternalLink, Calendar } from "lucide-react"
import { useCampaigns } from "@/lib/swr"
import { cn, getDateStatus } from "@/lib/utils"
import { PinnedBadge } from "@/components/portal/PinnedBadge"
import { useAnalytics } from "@/hooks/useAnalytics"
import { useAssetDrawer } from "@/hooks/useAssetDrawer"
import Image from "next/image"
import type { AssetInfo } from "@/types"

export default function CampaignsPage() {
  const { data, isLoading, error } = useCampaigns()
  const allCampaigns = useMemo(() => data?.assets || [], [data])
  const { trackAssetDownload } = useAnalytics()

  const [languageFilter, setLanguageFilter] = useState<string | null>(null)

  const allLanguages = useMemo(() => {
    const set = new Set<string>()
    for (const a of allCampaigns) {
      for (const l of a.availableLanguages || []) set.add(l)
    }
    return Array.from(set)
  }, [allCampaigns])

  const campaigns = useMemo(() => {
    if (!languageFilter) return allCampaigns
    return allCampaigns.filter((a: any) =>
      (a.availableLanguages || []).includes(languageFilter)
    )
  }, [allCampaigns, languageFilter])

  const transformCampaign = useCallback((campaign: any): AssetInfo => ({
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    type: "CAMPAIGN",
    category: "campaign",
    thumbnailUrl: campaign.thumbnailUrl,
    fileUrl: campaign.fileUrl,
    externalLink: campaign.externalLink || campaign.campaignLink,
    availableLanguages: campaign.availableLanguages,
    persona: campaign.persona,
    campaignGoal: campaign.campaignGoal,
    sentAt: campaign.sentAt,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  }), [])

  const { selectedAsset, drawerOpen, handleInfoClick, handleDrawerClose } =
    useAssetDrawer(campaigns, transformCampaign)

  const handleDownload = (campaign: any) => {
    trackAssetDownload(campaign.id, campaign.title, "CAMPAIGN")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns & Emails"
        description="Email templates and campaign materials"
      />

      <LanguageFilter
        availableLanguages={allLanguages}
        activeLanguage={languageFilter}
        onChange={setLanguageFilter}
      />

      {isLoading ? (
        <GridSkeleton cardPadding="none" roundedThumbnail={false} aspectRatio="aspect-[16/10]" />
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
      {campaign.isPinned && (
        <div className="absolute top-2 left-2 z-10">
          <PinnedBadge />
        </div>
      )}
      <div className="aspect-[16/10] bg-gray-100 relative">
        {campaign.thumbnailUrl ? (
          <Image
            src={campaign.thumbnailUrl}
            alt={campaign.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            placeholder={campaign.blurDataUrl ? "blur" : undefined}
            blurDataURL={campaign.blurDataUrl || undefined}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Mail className="w-12 h-12 text-gray-300" />
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 line-clamp-1">
          {campaign.title}
        </h3>

        {campaign.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {campaign.description}
          </p>
        )}

        {((formattedDate && dateStatus) || campaign.availableLanguages?.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {formattedDate && dateStatus && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white",
                  dateStatus === "past" ? "bg-gray-700" : "bg-primary"
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                {dateStatus === "past" ? "Sent" : "Scheduled"}: {formattedDate}
              </span>
            )}
            {campaign.availableLanguages?.map((l: string) => (
              <StatusBadge key={l} status="info">
                {l}
              </StatusBadge>
            ))}
          </div>
        )}

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
