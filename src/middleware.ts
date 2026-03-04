import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that don't require authentication
const publicRoutes = ["/login", "/login/verify", "/api/auth"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
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
