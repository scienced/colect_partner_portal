import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/SectionHeader"
import { FeaturedList } from "./FeaturedList"

export default async function AdminFeaturedPage() {
  const [featuredContent, assets, docsUpdates, productUpdates] = await Promise.all([
    prisma.featuredContent.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        asset: true,
        docsUpdate: true,
        productUpdate: true,
      },
    }),
    prisma.asset.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { title: "asc" },
    }),
    prisma.docsUpdate.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { title: "asc" },
    }),
    prisma.productUpdate.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { title: "asc" },
    }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Featured Content"
        description="Manage 'This Month for Partners' section"
      />
      <FeaturedList
        initialFeatured={featuredContent}
        assets={assets}
        docsUpdates={docsUpdates}
        productUpdates={productUpdates}
      />
    </div>
  )
}
