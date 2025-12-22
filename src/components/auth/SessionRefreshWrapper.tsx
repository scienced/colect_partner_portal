"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { initSupertokensFrontend } from "@/lib/supertokens/frontend"
import Session from "supertokens-web-js/recipe/session"

export function SessionRefreshWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [status, setStatus] = useState<"checking" | "refreshing" | "failed">("checking")

  useEffect(() => {
    async function attemptRefresh() {
      try {
        initSupertokensFrontend()

        // Check if session exists (this will trigger refresh if needed)
        const exists = await Session.doesSessionExist()

        if (exists) {
          // Session was refreshed successfully, reload to get fresh server data
          setStatus("refreshing")
          router.refresh()
        } else {
          // No valid session, redirect to login
          setStatus("failed")
          router.push("/login")
        }
      } catch (error) {
        console.error("Session refresh failed:", error)
        setStatus("failed")
        router.push("/login")
      }
    }

    attemptRefresh()
  }, [router])

  // Show loading state while checking/refreshing
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">
          {status === "checking" && "Checking session..."}
          {status === "refreshing" && "Refreshing session..."}
          {status === "failed" && "Redirecting to login..."}
        </p>
      </div>
    </div>
  )
}
