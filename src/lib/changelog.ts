import { prisma } from "./prisma"

type EntityType = "asset" | "docs_update" | "product_update"
type Action = "created" | "updated" | "deleted"

export async function createChangelog(
  action: Action,
  entityType: EntityType,
  entityId: string,
  entityTitle: string,
  description?: string
) {
  // Don't link to entity if it's been deleted (foreign key would fail)
  const shouldLinkEntity = action !== "deleted"

  await prisma.changelog.create({
    data: {
      action,
      entityType,
      entityId,
      entityTitle,
      description,
      ...(shouldLinkEntity && entityType === "asset" ? { assetId: entityId } : {}),
      ...(shouldLinkEntity && entityType === "docs_update" ? { docsUpdateId: entityId } : {}),
      ...(shouldLinkEntity && entityType === "product_update" ? { productUpdateId: entityId } : {}),
    },
  })
}

export async function getRecentChanges(limit = 20) {
  return prisma.changelog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

export async function getChangesSince(since: Date) {
  return prisma.changelog.findMany({
    where: {
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  })
}
