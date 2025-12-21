import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { Mail, ExternalLink, Target } from "lucide-react"

export default async function CampaignsPage() {
  const campaigns = await prisma.asset.findMany({
    where: {
      type: "CAMPAIGN",
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns & Emails"
        description="Email templates and campaign materials"
      />

      {campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => (
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
                  {campaign.language.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {campaign.language.map((l) => (
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
