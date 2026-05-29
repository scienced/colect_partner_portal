import { NextRequest } from "next/server"
import { requireApiKey, isAuthResponse } from "@/lib/v1Auth"
import { ok, httpErrors, withV1Handler } from "@/lib/v1Response"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"

const VALID_UPDATE_TYPES = ["release_note", "coming_up"] as const

export const GET = withV1Handler(async (request: NextRequest) => {
  const auth = await requireApiKey(request)
  if (isAuthResponse(auth)) return auth

  const { searchParams } = new URL(request.url)
  const updateType = searchParams.get("updateType")?.trim() || undefined
  if (updateType && !(VALID_UPDATE_TYPES as readonly string[]).includes(updateType)) {
    return httpErrors.badRequest(
      `Unknown updateType "${updateType}". Allowed: ${VALID_UPDATE_TYPES.join(", ")}.`
    )
  }

  const limit = clampInt(searchParams.get("limit"), 1, 100, 50)
  const offset = clampInt(searchParams.get("offset"), 0, 100_000, 0)

  const sinceRaw = searchParams.get("updatedSince")
  let updatedSince: Date | undefined
  if (sinceRaw) {
    const parsed = new Date(sinceRaw)
    if (Number.isNaN(parsed.getTime())) {
      return httpErrors.badRequest("`updatedSince` must be a valid ISO 8601 timestamp.")
    }
    updatedSince = parsed
  }

  const where: Prisma.ProductUpdateWhereInput = {
    publishedAt: { not: null },
    ...(updateType ? { updateType } : {}),
    ...(updatedSince ? { updatedAt: { gt: updatedSince } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.productUpdate.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }],
      skip: offset,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        updateType: true,
        releaseDate: true,
        link: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
      },
    }),
    prisma.productUpdate.count({ where }),
  ])

  return ok({
    items: items.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      updateType: p.updateType,
      releaseDate: p.releaseDate?.toISOString() ?? null,
      link: p.link,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      publishedAt: p.publishedAt?.toISOString() ?? null,
    })),
    total,
    limit,
    offset,
    nextOffset: offset + items.length < total ? offset + items.length : null,
  })
})

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(min, Math.min(max, n))
}
