import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/SectionHeader"
import { AssetsList } from "./AssetsList"

export default async function AdminAssetsPage() {
  const assets = await prisma.asset.findMany({
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets Management"
        description="Manage sales decks, campaigns, and other assets"
      />
      <AssetsList initialAssets={assets} />
    </div>
  )
}
