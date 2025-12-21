import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { PageHeader } from "@/components/layout/SectionHeader"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  ArrowRight,
  FileText,
  Download,
  Play,
  Plus,
  RefreshCw,
  Link as LinkIcon,
  MessageSquare,
  HelpCircle,
} from "lucide-react"

// Mock thumbnail colors for demo
const thumbnailColors = [
  "from-blue-400 to-blue-600",
  "from-purple-400 to-purple-600",
  "from-green-400 to-green-600",
  "from-orange-400 to-orange-600",
  "from-pink-400 to-pink-600",
  "from-teal-400 to-teal-600",
]

export default async function DashboardPage() {
  const [featuredContent, changelog, latestDecks, latestAssets, quickLinks] =
    await Promise.all([
      prisma.featuredContent.findMany({
        where: {
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
        orderBy: { displayOrder: "asc" },
        take: 5,
        include: {
          asset: true,
          docsUpdate: true,
          productUpdate: true,
        },
      }),
      prisma.changelog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.asset.findMany({
        where: {
          type: "DECK",
          publishedAt: { not: null },
        },
        orderBy: { publishedAt: "desc" },
        take: 4,
      }),
      // Latest assets (all types except DECK)
      prisma.asset.findMany({
        where: {
          type: { in: ["CAMPAIGN", "VIDEO", "ASSET"] },
          publishedAt: { not: null },
        },
        orderBy: { publishedAt: "desc" },
        take: 4,
      }),
      // Quick links (ASSET type only)
      prisma.asset.findMany({
        where: {
          type: "ASSET",
          publishedAt: { not: null },
        },
        orderBy: { publishedAt: "desc" },
        take: 4,
      }),
    ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner Dashboard"
        description="Welcome to the Colect Partner Portal"
      />

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* This Month for Partners */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              This Month for Partners
            </h2>
            {featuredContent.length > 0 ? (
              <ul className="space-y-3">
                {featuredContent.map((item) => {
                  const title =
                    item.asset?.title ||
                    item.docsUpdate?.title ||
                    item.productUpdate?.title ||
                    item.title
                  const type = item.entityType
                  return (
                    <li key={item.id} className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <span className="text-gray-500 text-sm">
                          {type === "asset" && "New: "}
                          {type === "docs_update" && "Documentation: "}
                          {type === "product_update" && "Product: "}
                        </span>
                        <Link
                          href={
                            type === "asset"
                              ? "/decks"
                              : type === "docs_update"
                              ? "/docs-updates"
                              : "/product"
                          }
                          className="text-primary hover:underline font-medium"
                        >
                          {title}
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No featured content this month</p>
            )}
          </Card>

          {/* Latest Sales Decks */}
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Latest Sales Decks</h2>
              <Link href="/decks">
                <Button
                  variant="ghost"
                  size="sm"
                  iconAfter={<ArrowRight className="w-4 h-4" />}
                >
                  View all
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {latestDecks.map((deck, index) => (
                <div key={deck.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  {/* Thumbnail */}
                  <div className={`h-28 bg-gradient-to-br ${thumbnailColors[index % thumbnailColors.length]} flex items-center justify-center`}>
                    {deck.thumbnailUrl ? (
                      <img
                        src={deck.thumbnailUrl}
                        alt={deck.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-10 h-10 text-white/70" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-1">{deck.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      {deck.language.length > 0 && (
                        <span>{deck.language.join(" / ")}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      Updated{" "}
                      {deck.publishedAt &&
                        formatDistanceToNow(deck.publishedAt, { addSuffix: true })}
                    </p>
                    {deck.fileUrl ? (
                      <a
                        href={deck.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="primary" size="sm" className="w-full" icon={<Download className="w-3 h-3" />}>
                          Download
                        </Button>
                      </a>
                    ) : (
                      <Button variant="secondary" size="sm" className="w-full" disabled>
                        No file
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {latestDecks.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">No sales decks available yet</p>
            )}
          </Card>

          {/* Latest Assets */}
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Latest Assets</h2>
              <Link href="/assets">
                <Button
                  variant="ghost"
                  size="sm"
                  iconAfter={<ArrowRight className="w-4 h-4" />}
                >
                  View all
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {latestAssets.map((asset, index) => {
                const typeLabels: Record<string, string> = {
                  CAMPAIGN: "Campaign",
                  VIDEO: "Video",
                  ASSET: "Asset",
                }
                const typeColors: Record<string, string> = {
                  CAMPAIGN: "from-purple-400 to-purple-600",
                  VIDEO: "from-red-400 to-red-600",
                  ASSET: "from-teal-400 to-teal-600",
                }
                return (
                  <div key={asset.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <div className={`h-28 bg-gradient-to-br ${typeColors[asset.type] || thumbnailColors[index % thumbnailColors.length]} flex items-center justify-center`}>
                      {asset.thumbnailUrl ? (
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.title}
                          className="w-full h-full object-cover"
                        />
                      ) : asset.type === "VIDEO" ? (
                        <Play className="w-10 h-10 text-white/70" />
                      ) : (
                        <FileText className="w-10 h-10 text-white/70" />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {typeLabels[asset.type] || asset.type}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-1">{asset.title}</h3>
                      <p className="text-xs text-gray-400">
                        {asset.publishedAt &&
                          formatDistanceToNow(asset.publishedAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            {latestAssets.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">No assets available yet</p>
            )}
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 flex-shrink-0 space-y-6">
          {/* What Changed */}
          <Card padding="lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What Changed</h3>
            <div className="space-y-3">
              {changelog.length > 0 ? (
                changelog.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                        item.action === "created"
                          ? "bg-green-50"
                          : item.action === "updated"
                          ? "bg-blue-50"
                          : "bg-gray-100"
                      }`}
                    >
                      {item.action === "created" ? (
                        <Plus className="w-3 h-3 text-green-600" />
                      ) : (
                        <RefreshCw className="w-3 h-3 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="text-gray-500 capitalize">{item.action}: </span>
                        <span className="text-primary font-medium">
                          {item.entityTitle}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recent changes</p>
              )}
            </div>
          </Card>

          {/* Quick Links */}
          <Card padding="lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Links
            </h3>
            <div className="space-y-2">
              {quickLinks.length > 0 ? (
                quickLinks.map((asset) => (
                  <a
                    key={asset.id}
                    href={asset.externalLink || asset.fileUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <LinkIcon className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-sm text-primary font-medium">{asset.title}</span>
                  </a>
                ))
              ) : (
                <p className="text-sm text-gray-500">No quick links available</p>
              )}
            </div>
            <div className="mt-4">
              <Link href="/assets">
                <Button
                  variant="ghost"
                  size="sm"
                  iconAfter={<ArrowRight className="w-4 h-4" />}
                  className="w-full justify-center"
                >
                  View All Links
                </Button>
              </Link>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button variant="primary" className="w-full" icon={<MessageSquare className="w-4 h-4" />}>
              Contact Partner Support
            </Button>
            <Button variant="secondary" className="w-full" icon={<HelpCircle className="w-4 h-4" />}>
              Request an Asset
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
