"use client"

import { useEffect, useState, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { initSupertokensFrontend } from "@/lib/supertokens/frontend"
import Session from "supertokens-web-js/recipe/session"

// Routes that don't require authentication
const publicRoutes = ["/login", "/login/verify"]

// Timeout for session check (10 seconds)
const SESSION_CHECK_TIMEOUT = 10000

type SessionState = "loading" | "valid" | "invalid" | "public" | "error"

export function SuperTokensProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [sessionState, setSessionState] = useState<SessionState>("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Clear all session cookies and redirect to login
  const clearSessionAndLogin = useCallback(() => {
    // Clear SuperTokens cookies
    const cookiesToClear = ["sAccessToken", "sRefreshToken", "sAntiCsrf", "sFrontToken"]
    cookiesToClear.forEach(name => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    })

    // Also try to sign out via SuperTokens (in case it helps clean up state)
    Session.signOut().catch(() => {
      // Ignore errors - we're already clearing cookies manually
    }).finally(() => {
      // Force redirect to login
      window.location.href = "/login"
    })
  }, [])

  // Initialize SuperTokens and check session on mount
  useEffect(() => {
    let cancelled = false
    let timeoutId: NodeJS.Timeout | null = null

    async function initAndCheckSession() {
      try {
        initSupertokensFrontend()

        // Skip session check for public routes
        if (isPublicRoute) {
          setSessionState("public")
          return
        }

        // Set up a timeout - if session check takes too long, show error
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Session check timed out"))
          }, SESSION_CHECK_TIMEOUT)
        })

        // Race between session check and timeout
        const exists = await Promise.race([
          Session.doesSessionExist(),
          timeoutPromise
        ])

        // Clear timeout if we got a response
        if (timeoutId) clearTimeout(timeoutId)

        if (cancelled) return

        if (exists) {
          setSessionState("valid")
        } else {
          setSessionState("invalid")
          router.push("/login")
        }
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId)

        console.error("Session check error:", error)

        if (!cancelled) {
          const isTimeout = error instanceof Error && error.message === "Session check timed out"
          setErrorMessage(
            isTimeout
              ? "Session verification is taking too long. This might be a network issue."
              : "There was a problem verifying your session."
          )
          setSessionState("error")
        }
      }
    }

    initAndCheckSession()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
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
        // Don't show error on recheck - just redirect to login
        setSessionState("invalid")
        router.push("/login")
      }
    }

    recheckSession()
  }, [pathname, sessionState, router, isPublicRoute])

  // For public routes, just render children immediately
  if (isPublicRoute || sessionState === "public") {
    return <>{children}</>
  }

  // Show error state with recovery option
  if (sessionState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Session Error
          </h2>
          <p className="text-gray-600 mb-6">
            {errorMessage || "There was a problem with your session."}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setSessionState("loading")
                setErrorMessage(null)
                window.location.reload()
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Try Again
            </button>
            <button
              onClick={clearSessionAndLogin}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Log In Again
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            If this keeps happening, try clearing your browser cookies.
          </p>
        </div>
      </div>
    )
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
