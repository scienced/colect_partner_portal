"use client"

import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { Mail, ExternalLink, Target, Calendar, Download } from "lucide-react"
import { useCampaigns } from "@/lib/swr"
import Image from "next/image"

export default function CampaignsPage() {
  const { data, isLoading, error } = useCampaigns()
  const campaigns = data?.assets || []

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
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No campaigns available yet</p>
        </Card>
      )}
    </div>
  )
}

function CampaignCard({ campaign }: { campaign: any }) {
  const sentDate = campaign.sentAt
    ? new Date(campaign.sentAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <Card hover padding="none" className="overflow-hidden flex flex-col">
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

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
          {sentDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{sentDate}</span>
            </div>
          )}
          {campaign.campaignGoal && (
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span className="truncate max-w-[150px]">{campaign.campaignGoal}</span>
            </div>
          )}
        </div>

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
        <div className="flex items-center gap-3 mt-auto pt-4">
          {campaign.fileUrl && (
            <a
              href={campaign.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Mail className="w-4 h-4" />
              View Email
            </a>
          )}
          {campaign.campaignLink && (
            <a
              href={campaign.campaignLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
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
