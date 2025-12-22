"use client"

import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { Mail, ExternalLink, Target } from "lucide-react"
import { useCampaigns } from "@/lib/swr"

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign: any) => (
            <Card key={campaign.id} hover padding="lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{campaign.title}</h3>
                  {campaign.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {campaign.description}
                    </p>
                  )}
                  {campaign.campaignGoal && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                      <Target className="w-4 h-4" />
                      <span>{campaign.campaignGoal}</span>
                    </div>
                  )}
                  {campaign.language?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {campaign.language.map((l: string) => (
                        <StatusBadge key={l} status="info">
                          {l}
                        </StatusBadge>
                      ))}
                    </div>
                  )}
                  {campaign.campaignLink && (
                    <a
                      href={campaign.campaignLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Campaign
                    </a>
                  )}
                </div>
              </div>
            </Card>
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

function CampaignsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} padding="lg">
          <div className="flex items-start gap-4 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
