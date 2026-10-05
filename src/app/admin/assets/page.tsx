import { PageHeader } from "@/components/layout/SectionHeader"
import { AssetsList } from "./AssetsList"
import { fetchAdminAssets } from "@/lib/adminAssets"

export default async function AdminAssetsPage() {
  const assets = await fetchAdminAssets({
    // Ad sets have their own admin page (/admin/ads).
    where: { type: { not: "SOCIAL_AD" } },
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
