import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/SectionHeader"
import { AssetsList } from "./AssetsList"
import { getPresignedUrlIfNeeded } from "@/lib/s3"

export default async function AdminAssetsPage() {
  const assetsRaw = await prisma.asset.findMany({
    orderBy: { updatedAt: "desc" },
  })

  // Generate presigned URLs for S3 files
  const assets = await Promise.all(
    assetsRaw.map(async (asset) => ({
      ...asset,
      thumbnailUrl: await getPresignedUrlIfNeeded(asset.thumbnailUrl),
      fileUrl: await getPresignedUrlIfNeeded(asset.fileUrl),
    }))
  )

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
