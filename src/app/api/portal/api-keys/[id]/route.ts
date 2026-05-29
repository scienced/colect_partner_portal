import { NextResponse } from "next/server"
import { requireSession } from "@/lib/supertokens/session"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * Revoke (soft-delete) a key. Any user at the SAME domain as the key's owner
 * can revoke it — see memory: api-scope-mirrors-ui. Idempotent: revoking an
 * already-revoked key returns 200 with the same shape.
 */
export async function DELETE(_request: Request, ctx: RouteCtx) {
  const session = await requireSession().catch(() => null)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const callerDomain = session.user.email.split("@")[1]?.toLowerCase()
  if (!callerDomain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 })
  }

  const { id } = await ctx.params
  const key = await prisma.apiKey.findUnique({ where: { id } })
  if (!key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (key.domain !== callerDomain) {
    // Don't reveal whether the key exists at another domain.
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const updated = key.revokedAt
    ? key
    : await prisma.apiKey.update({
        where: { id: key.id },
        data: { revokedAt: new Date() },
      })

  return NextResponse.json({
    ok: true,
    id: updated.id,
    revokedAt: updated.revokedAt!.toISOString(),
  })
}
