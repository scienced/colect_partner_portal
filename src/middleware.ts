import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that don't require authentication
const publicRoutes = ["/login", "/login/verify", "/api/auth"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Maintenance mode: set MAINTENANCE_MODE=true on DO to show a clean
  // holding page while database migrations or major deploys are in progress.
  if (process.env.MAINTENANCE_MODE === "true") {
    if (pathname.startsWith("/_next") || pathname.includes(".")) {
      return NextResponse.next()
    }
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Maintenance — Colect Partner Portal</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f9fafb; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 48px; max-width: 480px; text-align: center; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); }
    h1 { font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 12px; }
    p { font-size: 16px; color: #6b7280; line-height: 1.6; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ef556d; margin-right: 4px; animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
  </style>
</head>
<body>
  <div class="card">
    <h1><span class="dot"></span> Brief maintenance</h1>
    <p>The Colect Partner Portal is being updated with new features. We'll be back shortly.</p>
  </div>
</body>
</html>`,
      {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Retry-After": "3600",
        },
      }
    )
  }

  const hostname = request.headers.get("host") || ""

  // Redirect old DigitalOcean domain to the canonical custom domain
  const canonicalDomain = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
    : null
  if (canonicalDomain && hostname !== canonicalDomain && hostname.endsWith(".ondigitalocean.app")) {
    const url = request.nextUrl.clone()
    url.host = canonicalDomain
    url.protocol = "https"
    url.port = ""
    return NextResponse.redirect(url, 308)
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow API routes (they handle their own auth)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Check for SuperTokens session cookies
  const accessToken = request.cookies.get("sAccessToken")
  const refreshToken = request.cookies.get("sRefreshToken")

  // If no tokens at all, redirect to login
  if (!accessToken && !refreshToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If we have a refresh token but access token might be expired,
  // let the request through - the client-side SDK will handle refresh
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
