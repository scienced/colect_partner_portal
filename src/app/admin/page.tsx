import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/Card"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Button } from "@/components/ui/Button"
import {
  FileText,
  BookOpen,
  Users,
  Star,
  Plus,
  ArrowRight,
} from "lucide-react"

export default async function AdminDashboardPage() {
  const [assetCount, docsCount, teamCount, featuredCount] = await Promise.all([
    prisma.asset.count(),
    prisma.docsUpdate.count(),
    prisma.teamMember.count(),
    prisma.featuredContent.count(),
  ])

  const stats = [
    {
      label: "Assets",
      count: assetCount,
      icon: FileText,
      href: "/admin/assets",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Docs Updates",
      count: docsCount,
      icon: BookOpen,
      href: "/admin/docs-updates",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Team Members",
      count: teamCount,
      icon: Users,
      href: "/admin/who-is-who",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Featured Items",
      count: featuredCount,
      icon: Star,
      href: "/admin/featured",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
  ]

  const recentAssets = await prisma.asset.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        description="Manage your partner portal content"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href}>
              <Card hover clickable padding="lg">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 ${stat.bg} rounded-lg flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.count}
                    </p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/assets?new=deck">
            <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
              Add Sales Deck
            </Button>
          </Link>
          <Link href="/admin/assets?new=campaign">
            <Button variant="secondary" icon={<Plus className="w-4 h-4" />}>
              Add Campaign
            </Button>
          </Link>
          <Link href="/admin/docs-updates?new=true">
            <Button variant="secondary" icon={<Plus className="w-4 h-4" />}>
              Add Docs Update
            </Button>
          </Link>
          <Link href="/admin/featured?new=true">
            <Button variant="secondary" icon={<Plus className="w-4 h-4" />}>
              Feature Content
            </Button>
          </Link>
        </div>
      </Card>

      {/* Recent Assets */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Assets</h3>
          <Link href="/admin/assets">
            <Button
              variant="ghost"
              size="sm"
              iconAfter={<ArrowRight className="w-4 h-4" />}
            >
              View all
            </Button>
          </Link>
        </div>
        {recentAssets.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentAssets.map((asset) => (
              <div
                key={asset.id}
                className="py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                    <FileText className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{asset.title}</p>
                    <p className="text-sm text-gray-500">{asset.type}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-400">
                  {asset.createdAt.toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No assets yet</p>
        )}
      </Card>
    </div>
  )
}
