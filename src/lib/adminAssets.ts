import { prisma } from "@/lib/prisma"
import { getPresignedUrlIfNeeded } from "@/lib/s3"
import type { Prisma } from "@prisma/client"

/**
 * Canonical way for admin server components to load Asset rows with their
 * variants and all presigned URLs ready to hand to a client component.
 *
 * Every admin page that needs editable Asset rows should go through this
 * helper — never call prisma.asset.findMany directly — so the variants
 * relation and presigning stay in sync across pages.
 *
 * @param args - Optional Prisma findMany args (where, orderBy, take, etc.)
 */
export async function fetchAdminAssets(
  args: Omit<Prisma.AssetFindManyArgs, "include"> = {}
) {
  const assetsRaw = await prisma.asset.findMany({
    ...args,
    include: {
      variants: {
        orderBy: [{ displayOrder: "asc" }, { language: "asc" }],
      },
    },
  })

  return Promise.all(
    assetsRaw.map(async (asset) => ({
      ...asset,
      thumbnailUrl: await getPresignedUrlIfNeeded(asset.thumbnailUrl),
      // Legacy fileUrl (expand phase) — presign for the card "View file" link
      fileUrl: await getPresignedUrlIfNeeded(asset.fileUrl),
      variants: await Promise.all(
        asset.variants.map(async (v) => ({
          ...v,
          fileUrl: await getPresignedUrlIfNeeded(v.fileUrl),
        }))
      ),
    }))
  )
}

/** The shape returned by fetchAdminAssets — useful for client component props. */
export type AdminAsset = Awaited<ReturnType<typeof fetchAdminAssets>>[number]
