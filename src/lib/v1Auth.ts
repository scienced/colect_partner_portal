import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { findActiveKeyByPlaintext, parseAuthorizationHeader } from "./apiKeys"
import { httpErrors } from "./v1Response"
import { getViewer, type Viewer } from "./access"
import { UserRole, type ApiKey, type AnalyticsEventType, type User } from "@prisma/client"

export interface V1Auth {
  user: User
  apiKey: ApiKey
  /** The key owner's content audience — same rules as their portal login. */
  viewer: Viewer
  /** "MCP_QUERY" when the request came from our MCP server, else "API_QUERY". */
  source: AnalyticsEventType
}

/** Scope granted to every key. */
export const SCOPE_READ = "read:portal"
/** Scope that allows creating/editing content. Only admins can hold it. */
export const SCOPE_WRITE = "write:content"

/**
 * Per-key in-process rate limit. Generous on purpose — the goal is to stop a
 * runaway loop, not to be precise. A clustered prod deploy would want a Redis
 * token bucket; that's a Phase 2 upgrade.
 */
const RATE_LIMIT_PER_MIN = 120
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function rateLimitOk(keyId: string): boolean {
  const now = Date.now()
  const b = rateBuckets.get(keyId)
  if (!b || b.resetAt < now) {
    rateBuckets.set(keyId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (b.count >= RATE_LIMIT_PER_MIN) return false
  b.count++
  return true
}

function detectSource(request: NextRequest): AnalyticsEventType {
  // The MCP server sets this header. Anything else counts as a raw API call.
  if (request.headers.get("x-colect-source") === "mcp") return "MCP_QUERY"
  const ua = request.headers.get("user-agent") || ""
  if (ua.startsWith("ColectMCP/")) return "MCP_QUERY"
  return "API_QUERY"
}

/**
 * Resolve an /api/v1/* request's Bearer token to its User + ApiKey. Returns a
 * `Response` on failure (the caller can early-return). On success, schedules a
 * background `AnalyticsEvent` write — the audit trail outlives the key.
 */
export async function requireApiKey(
  request: NextRequest,
  meta?: { query?: string; scope?: typeof SCOPE_WRITE }
): Promise<V1Auth | Response> {
  const plaintext = parseAuthorizationHeader(request.headers.get("authorization"))
  if (!plaintext) {
    return httpErrors.unauthorized(
      "Provide a Bearer token in the Authorization header. See https://partnerportal.colect.io/docs/api"
    )
  }

  const apiKey = await findActiveKeyByPlaintext(plaintext)
  if (!apiKey) return httpErrors.unauthorized("API key is invalid, revoked, or expired.")

  if (!rateLimitOk(apiKey.id)) return httpErrors.rateLimited()

  const user = await prisma.user.findUnique({ where: { id: apiKey.userId } })
  if (!user) return httpErrors.unauthorized("API key's owning user no longer exists.")

  // Write calls need the scope on the key AND a still-admin owner: demoting a
  // user immediately disables writes from every key they minted.
  if (meta?.scope === SCOPE_WRITE) {
    if (!apiKey.scopes.includes(SCOPE_WRITE)) {
      return httpErrors.forbidden(
        "This API key is read-only. An admin can create a key with content write access at /settings/api-keys."
      )
    }
    if (user.role !== UserRole.ADMIN) {
      return httpErrors.forbidden("Only admins can create or edit content.")
    }
  }

  const source = detectSource(request)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null

  // Fire-and-forget: never let audit slowness block the response.
  Promise.all([
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date(), lastUsedIp: ip },
    }),
    prisma.analyticsEvent.create({
      data: {
        type: source,
        userId: user.id,
        userEmail: user.email,
        userDomain: apiKey.domain,
        pagePath: new URL(request.url).pathname,
        searchQuery: meta?.query ?? null,
        apiKeyId: apiKey.id,
      },
    }),
  ]).catch((e) => console.error("[v1-auth] background audit failed:", e))

  return { user, apiKey, viewer: await getViewer(user), source }
}

export function isAuthResponse(x: V1Auth | Response): x is Response {
  return x instanceof Response
}
