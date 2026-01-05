"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { initSupertokensFrontend } from "@/lib/supertokens/frontend"
import Session from "supertokens-web-js/recipe/session"

// Routes that don't require authentication
const publicRoutes = ["/login", "/login/verify"]

export function SuperTokensProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [sessionState, setSessionState] = useState<"loading" | "valid" | "invalid" | "public">("loading")
  const pathname = usePathname()
  const router = useRouter()

  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Initialize SuperTokens and check session on mount
  useEffect(() => {
    let cancelled = false

    async function initAndCheckSession() {
      try {
        initSupertokensFrontend()

        // Skip session check for public routes
        if (isPublicRoute) {
          setSessionState("public")
          return
        }

        // This will automatically refresh the session if needed
        const exists = await Session.doesSessionExist()

        if (cancelled) return

        if (exists) {
          setSessionState("valid")
        } else {
          setSessionState("invalid")
          // Redirect to login
          router.push("/login")
        }
      } catch (error) {
        console.error("Session check error:", error)
        if (!cancelled) {
          setSessionState("invalid")
          router.push("/login")
        }
      }
    }

    initAndCheckSession()

    return () => {
      cancelled = true
    }
  }, [router, isPublicRoute])

  // Re-check session on path changes (but not on initial mount or public routes)
  useEffect(() => {
    if (sessionState !== "valid" || isPublicRoute) return

    async function recheckSession() {
      try {
        const exists = await Session.doesSessionExist()
        if (!exists) {
          setSessionState("invalid")
          router.push("/login")
        }
      } catch (error) {
        console.error("Session recheck error:", error)
      }
    }

    recheckSession()
  }, [pathname, sessionState, router, isPublicRoute])

  // For public routes, just render children immediately
  if (isPublicRoute || sessionState === "public") {
    return <>{children}</>
  }

  // Show loading spinner while checking session
  if (sessionState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render children if session is invalid (redirect is in progress)
  if (sessionState === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Only render children once session is confirmed valid
  return <>{children}</>
}
