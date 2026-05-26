/**
 * Reliably clears any stale SuperTokens session cookies by asking the server to
 * expire them via Set-Cookie.
 *
 * Why a server round-trip is required: SuperTokens session cookies
 * (sAccessToken / sRefreshToken / sAntiCsrf) are httpOnly, so they CANNOT be
 * removed from client-side JavaScript — `document.cookie = "...; expires=..."`
 * is a silent no-op for them.
 *
 * Why we need to clear them at all: the passwordless createCode (send link) and
 * consumeCode (verify link) endpoints internally call
 * getSession({ sessionRequired: false }). A structurally-valid but expired /
 * dead access token still throws (TRY_REFRESH_TOKEN / UNAUTHORISED) -> HTTP 401,
 * BEFORE any of our backend code runs. For a user whose browser still holds a
 * months-old, now-invalid session cookie this surfaces as
 * "Failed to send magic link. Please try again." Clearing the cookies before
 * starting the login flow prevents the 401 entirely.
 *
 * This is best-effort and must never block the login flow.
 */
export async function clearAuthCookies(reason: string): Promise<void> {
  if (typeof window === "undefined") return
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    await fetch("/api/auth-clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
    clearTimeout(timeout)
  } catch {
    // Never block login on a failed clear attempt.
  }
}
