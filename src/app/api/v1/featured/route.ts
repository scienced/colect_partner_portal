import { NextRequest } from "next/server"
import { requireApiKey, isAuthResponse } from "@/lib/v1Auth"
import { ok, withV1Handler } from "@/lib/v1Response"
import { prisma } from "@/lib/prisma"
import { featuredAccessWhere } from "@/lib/access"

export const dynamic = "force-dynamic"

export const GET = withV1Handler(async (request: NextRequest) => {
  const auth = await requireApiKey(request)
  if (isAuthResponse(auth)) return auth

  const now = new Date()

  const items = await prisma.featuredContent.findMany({
    where: {
      startDate: { lte: now },
      AND: [
        { OR: [{ endDate: null }, { endDate: { gt: now } }] },
        featuredAccessWhere(auth.viewer),
      ],
    },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      displayOrder: true,
      entityType: true,
      assetId: true,
      docsUpdateId: true,
      productUpdateId: true,
      startDate: true,
      endDate: true,
    },
  })

  return ok({
    items: items.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      displayOrder: f.displayOrder,
      entityType: f.entityType,
      // Convenience pointer to the linked entity. Callers can fetch the full
      // record via /api/v1/{type}/{id} (assets only have a detail endpoint in v1).
      linkedEntityId: f.assetId || f.docsUpdateId || f.productUpdateId,
      startDate: f.startDate.toISOString(),
      endDate: f.endDate?.toISOString() ?? null,
    })),
    total: items.length,
  })
})
