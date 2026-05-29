import { NextRequest } from "next/server"
import { requireApiKey, isAuthResponse } from "@/lib/v1Auth"
import { ok, withV1Handler } from "@/lib/v1Response"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"

export const GET = withV1Handler(async (request: NextRequest) => {
  const auth = await requireApiKey(request)
  if (isAuthResponse(auth)) return auth

  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")?.trim() || undefined
  const limit = clampInt(searchParams.get("limit"), 1, 100, 50)
  const offset = clampInt(searchParams.get("offset"), 0, 100_000, 0)

  const where: Prisma.DocsUpdateWhereInput = {
    publishedAt: { not: null },
    ...(category ? { category } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.docsUpdate.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      skip: offset,
      take: limit,
      select: {
        id: true,
        title: true,
        summary: true,
        deepLink: true,
        category: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
      },
    }),
    prisma.docsUpdate.count({ where }),
  ])

  return ok({
    items: items.map((d) => ({
      id: d.id,
      title: d.title,
      summary: d.summary,
      deepLink: d.deepLink,
      category: d.category,
      isPinned: d.isPinned,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      publishedAt: d.publishedAt?.toISOString() ?? null,
    })),
    total,
    limit,
    offset,
  })
})

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(min, Math.min(max, n))
}
