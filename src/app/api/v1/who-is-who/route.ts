import { NextRequest } from "next/server"
import { requireApiKey, isAuthResponse } from "@/lib/v1Auth"
import { ok, withV1Handler } from "@/lib/v1Response"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export const GET = withV1Handler(async (request: NextRequest) => {
  const auth = await requireApiKey(request)
  if (isAuthResponse(auth)) return auth

  const { searchParams } = new URL(request.url)
  const department = searchParams.get("department")?.trim() || undefined
  const limit = clampInt(searchParams.get("limit"), 1, 100, 50)
  const offset = clampInt(searchParams.get("offset"), 0, 100_000, 0)

  const where = department ? { department } : {}

  const [items, total] = await Promise.all([
    prisma.teamMember.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      skip: offset,
      take: limit,
      select: {
        id: true,
        name: true,
        role: true,
        department: true,
        email: true,
        photoUrl: true,
        bio: true,
        linkedIn: true,
        displayOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.teamMember.count({ where }),
  ])

  return ok({
    items: items.map((t) => ({
      id: t.id,
      name: t.name,
      role: t.role,
      department: t.department,
      email: t.email,
      photoUrl: t.photoUrl,
      bio: t.bio,
      linkedIn: t.linkedIn,
      displayOrder: t.displayOrder,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
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
