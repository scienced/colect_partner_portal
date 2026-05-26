import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Unconditionally expires any SuperTokens session cookies via Set-Cookie.
 *
 * Background — the bug this fixes:
 * SuperTokens' passwordless createCode (`/api/auth/signinup/code`) and
 * consumeCode (`/api/auth/signinup/code/consume`) endpoints internally call
 * getSession({ sessionRequired: false }) BEFORE our API override runs. An
 * expired / dead access token throws TRY_REFRESH_TOKEN / UNAUTHORISED, which
 * SuperTokens turns into HTTP 401 (sessionExpiredStatusCode). The frontend then
 * tries to refresh; the refresh token is also dead, so the 401 surfaces as
 * "Failed to send magic link. Please try again." This blocks login for any user
 * whose browser still holds a stale (e.g. months-old) session cookie.
 *
 * The session cookies are httpOnly, so the only reliable way to clear them is a
 * server Set-Cookie response — which is what this endpoint provides. The login
 * and verify pages call it before starting the magic-link flow so the flow
 * always begins from a clean state.
 *
 * It also logs when a stale session was actually present, so recurrence is
 * visible in production logs (grep for: [auth-clear]).
 *
 * This endpoint is intentionally public (no session required) — it only ever
 * deletes cookies, never reads or grants anything.
 */

// SuperTokens default cookie paths (see supertokens-node session config):
//   sAccessToken / sAntiCsrf -> "/"
//   sRefreshToken            -> apiBasePath + "/session/refresh"
// Cookie deletion only works when name + path (+ domain) match the original, so
// we emit a clear for each path a cookie may have been set on. No cookieDomain
// is configured (apiDomain === websiteDomain), so the cookies are host-only and
// we must NOT set a Domain attribute.
const REFRESH_PATH = "/api/auth/session/refresh"

const COOKIES_TO_CLEAR: Array<{ name: string; paths: string[]; httpOnly: boolean }> = [
  { name: "sAccessToken", paths: ["/"], httpOnly: true },
  { name: "sRefreshToken", paths: [REFRESH_PATH, "/"], httpOnly: true },
  { name: "sAntiCsrf", paths: ["/"], httpOnly: true },
  { name: "sFrontToken", paths: ["/"], httpOnly: false },
  { name: "st-last-access-token-update", paths: ["/"], httpOnly: false },
  // Legacy names from older SuperTokens versions — harmless if absent.
  { name: "sIdRefreshToken", paths: ["/", REFRESH_PATH], httpOnly: false },
]

function buildClearCookie(
  name: string,
  path: string,
  httpOnly: boolean,
  secure: boolean
): string {
  const parts = [
    `${name}=`,
    `Path=${path}`,
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "SameSite=Lax",
  ]
  if (httpOnly) parts.push("HttpOnly")
  // A browser will not accept a `Secure` Set-Cookie over plain http (local dev),
  // so only mark Secure when the request is actually https (production).
  if (secure) parts.push("Secure")
  return parts.join("; ")
}

async function handle(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || ""
  const hadStaleSession = /(?:^|;\s*)(?:sAccessToken|sRefreshToken)=/.test(cookieHeader)

  let reason = "unknown"
  try {
    const body = await request.json()
    if (body && typeof body.reason === "string") reason = body.reason
  } catch {
    // Body is optional (e.g. navigator.sendBeacon may send no JSON body).
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")
  const secure = forwardedProto === "https" || request.nextUrl.protocol === "https:"

  const res = NextResponse.json({ ok: true, cleared: hadStaleSession })
  for (const cookie of COOKIES_TO_CLEAR) {
    for (const path of cookie.paths) {
      res.headers.append(
        "Set-Cookie",
        buildClearCookie(cookie.name, path, cookie.httpOnly, secure)
      )
    }
  }

  if (hadStaleSession) {
    // High-signal log line: counts how often partners hit a dead session.
    console.warn(
      "[auth-clear] stale session cleared " +
        JSON.stringify({
          reason,
          ua: request.headers.get("user-agent") || null,
          ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            null,
          ts: new Date().toISOString(),
        })
    )
  }

  return res
}

export async function POST(request: NextRequest) {
  return handle(request)
}
