import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireSession } from "@/lib/supertokens/session"
import { prisma } from "@/lib/prisma"
import { issueKey, maskKeyForDisplay, DEFAULT_KEY_TTL_DAYS, MAX_ACTIVE_KEYS_PER_USER } from "@/lib/apiKeys"
import { SCOPE_READ, SCOPE_WRITE } from "@/lib/v1Auth"

export const dynamic = "force-dynamic"

const NO_CACHE = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
}

// ─── GET: list every key at the caller's domain ──────────────────────────────
// Domain-wide visibility is intentional: with domain-based auth, anyone at the
// partner can see (and revoke) any key minted at that partner. See memory:
// api-scope-mirrors-ui.
export async function GET() {
  const session = await requireSession().catch(() => null)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE })
  }

  const domain = session.user.email.split("@")[1]?.toLowerCase()
  if (!domain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400, headers: NO_CACHE })
  }

  const keys = await prisma.apiKey.findMany({
    where: { domain },
    orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { email: true } } },
  })

  return NextResponse.json(
    {
      items: keys.map((k) => ({
        id: k.id,
        label: k.label,
        prefix: k.prefix,
        display: maskKeyForDisplay(k.prefix),
        scopes: k.scopes,
        creatorEmail: k.user.email,
        // "yours" lets the UI distinguish "my keys" from "colleague's keys".
        isMine: k.userId === session.user!.id,
        createdAt: k.createdAt.toISOString(),
        expiresAt: k.expiresAt?.toISOString() ?? null,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        lastUsedIp: k.lastUsedIp,
        revokedAt: k.revokedAt?.toISOString() ?? null,
        status: k.revokedAt
          ? "revoked"
          : k.expiresAt && k.expiresAt.getTime() < Date.now()
          ? "expired"
          : "active",
      })),
      limits: {
        maxActiveKeysPerUser: MAX_ACTIVE_KEYS_PER_USER,
        defaultTtlDays: DEFAULT_KEY_TTL_DAYS,
      },
      // Content write access mirrors the UI: only admins can add/edit content.
      canCreateWriteKeys: session.user.role === "ADMIN",
    },
    { headers: NO_CACHE }
  )
}

// ─── POST: mint a new key for the caller ─────────────────────────────────────
const createSchema = z.object({
  label: z.string().min(1).max(80),
  ttlDays: z.union([z.number().int().min(1).max(365), z.null()]).optional(),
  // Lets agents create/edit content via /api/v1. Admins only.
  allowWrite: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE })
  }

  const json = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400, headers: NO_CACHE }
    )
  }

  const domain = session.user.email.split("@")[1]?.toLowerCase()
  if (!domain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400, headers: NO_CACHE })
  }

  if (parsed.data.allowWrite && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only admins can create keys with content write access." },
      { status: 403, headers: NO_CACHE }
    )
  }

  try {
    const { plaintext, record } = await issueKey({
      userId: session.user.id,
      userDomain: domain,
      label: parsed.data.label,
      ttlDays: parsed.data.ttlDays ?? undefined,
      scopes: parsed.data.allowWrite ? [SCOPE_READ, SCOPE_WRITE] : [SCOPE_READ],
    })

    return NextResponse.json(
      {
        // Shown ONCE in the UI — the user must copy it now.
        plaintext,
        key: {
          id: record.id,
          label: record.label,
          prefix: record.prefix,
          display: maskKeyForDisplay(record.prefix),
          scopes: record.scopes,
          createdAt: record.createdAt.toISOString(),
          expiresAt: record.expiresAt?.toISOString() ?? null,
        },
      },
      { status: 201, headers: NO_CACHE }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create API key"
    return NextResponse.json({ error: message }, { status: 400, headers: NO_CACHE })
  }
}
