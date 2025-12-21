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
  await prisma.changelog.create({
    data: {
      action,
      entityType,
      entityId,
      entityTitle,
      description,
      ...(entityType === "asset" ? { assetId: entityId } : {}),
      ...(entityType === "docs_update" ? { docsUpdateId: entityId } : {}),
      ...(entityType === "product_update" ? { productUpdateId: entityId } : {}),
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
