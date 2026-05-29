import { NextRequest, NextResponse } from "next/server"

/**
 * Consistent JSON envelope for /api/v1/* responses. Errors always carry a
 * stable `code` agents/clients can branch on; the human-readable `message`
 * may change between versions.
 */
export interface ErrorBody {
  error: {
    code: string
    message: string
  }
}

const SECURITY_HEADERS = {
  // API responses should never be cached or indexed.
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
}

export function ok<T>(data: T, init?: { headers?: Record<string, string> }): NextResponse {
  return NextResponse.json(data, {
    status: 200,
    headers: { ...SECURITY_HEADERS, ...(init?.headers ?? {}) },
  })
}

export function err(status: number, code: string, message: string): NextResponse {
  return NextResponse.json<ErrorBody>(
    { error: { code, message } },
    { status, headers: SECURITY_HEADERS }
  )
}

export const httpErrors = {
  badRequest:    (m = "Bad request")                       => err(400, "bad_request", m),
  unauthorized:  (m = "Missing or invalid API key")        => err(401, "unauthorized", m),
  forbidden:     (m = "Forbidden")                         => err(403, "forbidden", m),
  notFound:      (m = "Not found")                         => err(404, "not_found", m),
  rateLimited:   (m = "Too many requests")                 => err(429, "rate_limited", m),
  serverError:   (m = "Internal error")                    => err(500, "server_error", m),
}

/**
 * Wraps a /api/v1/* route handler so unexpected exceptions always surface as
 * our consistent `{error:{code,message}}` JSON shape instead of a generic Next
 * 500. Without this, a DB outage (or any unhandled throw) leaks a stack to the
 * client; with it, the client always gets a parseable error.
 *
 * Use:  export const GET = withV1Handler(async (request, ctx) => { ... })
 */
type V1Handler<Ctx> = (request: NextRequest, ctx: Ctx) => Promise<Response>

/**
 * Public-facing origin for URLs that the API emits.
 *
 * Important: behind DigitalOcean's ingress proxy, `request.url` reflects the
 * internal upstream (typically `http://localhost:3000`), NOT the public URL —
 * so naive `new URL(request.url).origin` ends up baking `localhost` into every
 * search result, asset deep-link, and the openapi `servers` field. Prefer the
 * deployment-time `NEXT_PUBLIC_APP_URL` env var; fall back to standard proxy
 * headers, then finally the request itself for non-proxied local dev.
 */
export function getCanonicalOrigin(request: NextRequest): string {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL
  if (envOrigin) {
    try { return new URL(envOrigin).origin } catch { /* fall through */ }
  }
  const proto = request.headers.get("x-forwarded-proto") || "https"
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (host) return `${proto}://${host}`
  return new URL(request.url).origin
}

export function withV1Handler<Ctx = undefined>(handler: V1Handler<Ctx>): V1Handler<Ctx> {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx)
    } catch (e) {
      const path = (() => {
        try { return new URL(request.url).pathname } catch { return "<unknown>" }
      })()
      console.error(`[v1] ${request.method} ${path} unhandled error:`, e)
      return httpErrors.serverError()
    }
  }
}
