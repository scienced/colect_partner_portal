"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { initSupertokensFrontend } from "@/lib/supertokens/frontend"
import Session from "supertokens-web-js/recipe/session"

export function SuperTokensProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    initSupertokensFrontend()
    setMounted(true)
  }, [])

  // Check and refresh session on mount and path changes
  useEffect(() => {
    if (!mounted) return

    async function checkSession() {
      try {
        // This will automatically refresh the session if needed
        const exists = await Session.doesSessionExist()

        // If we're on a protected route and no session, redirect to login
        const isProtectedRoute = !pathname.startsWith("/login") && pathname !== "/"
        if (!exists && isProtectedRoute) {
          router.push("/login")
        }
      } catch (error) {
        console.error("Session check error:", error)
      }
    }

    checkSession()
  }, [mounted, pathname, router])

  // Prevent hydration mismatch by only rendering children after mount
  if (!mounted) {
    return null
  }

  return <>{children}</>
}
