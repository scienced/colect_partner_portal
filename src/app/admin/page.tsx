import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/Card"
import { PageHeader } from "@/components/layout/SectionHeader"
import {
  FileText,
  BookOpen,
  Users,
  Star,
} from "lucide-react"
import { AdminDashboardClient } from "./AdminDashboardClient"

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

      {/* Client-side interactive components */}
      <AdminDashboardClient recentAssets={recentAssets} />
    </div>
  )
}
