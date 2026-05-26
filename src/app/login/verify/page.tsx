"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { consumeCode } from "supertokens-web-js/recipe/passwordless"
import Session from "supertokens-web-js/recipe/session"
import { initSupertokensFrontend } from "@/lib/supertokens/frontend"
import { clearAuthCookies } from "@/lib/auth-clear"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { siteConfig } from "@/config/site"

type VerifyState = "verifying" | "success" | "error"

function VerifyContent() {
  const router = useRouter()
  const [state, setState] = useState<VerifyState>("verifying")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initSupertokensFrontend()

    const verifyMagicLink = async () => {
      // consumeCode also calls getSession({ sessionRequired: false }) internally,
      // which 401s on a stale/expired access token and would break magic-link
      // verification. Clear dead session cookies before consuming the code — but
      // ONLY when there is no usable session. doesSessionExist() returns true for
      // valid OR refreshable sessions (it auto-refreshes an expired access token)
      // and false only for a genuinely dead session, so this never logs out a
      // user who is still legitimately signed in.
      try {
        const hasSession = await Session.doesSessionExist()
        if (!hasSession) {
          await clearAuthCookies("verify-page")
        }
      } catch {
        // Session state is broken/unreadable — safe to clear.
        await clearAuthCookies("verify-page")
      }

      try {
        const response = await consumeCode()

        if (response.status === "OK") {
          setState("success")
          setTimeout(() => {
            router.push("/")
          }, 1500)
        } else if (response.status === "INCORRECT_USER_INPUT_CODE_ERROR") {
          setError("Invalid or expired link. Please request a new one.")
          setState("error")
        } else if (response.status === "EXPIRED_USER_INPUT_CODE_ERROR") {
          setError("This link has expired. Please request a new one.")
          setState("error")
        } else if (response.status === "RESTART_FLOW_ERROR") {
          setError("Session expired. Please start the login process again.")
          setState("error")
        } else {
          setError("Something went wrong. Please try again.")
          setState("error")
        }
      } catch (err: any) {
        console.error("Verification error:", err)
        setError(err?.message || "Failed to verify. Please try again.")
        setState("error")
      }
    }

    verifyMagicLink()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">{siteConfig.name}</h1>
          <p className="text-gray-500 mt-1">{siteConfig.title}</p>
        </div>

        <Card padding="lg" className="shadow-lg">
          {state === "verifying" && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">
                Verifying your login...
              </h2>
              <p className="text-gray-600 mt-2">
                Please wait while we sign you in.
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">
                Login successful!
              </h2>
              <p className="text-gray-600 mt-2">
                Redirecting you to the portal...
              </p>
            </div>
          )}

          {state === "error" && (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">
                Verification failed
              </h2>
              <p className="text-gray-600 mt-2 mb-6">{error}</p>
              <Button
                variant="primary"
                onClick={() => router.push("/login")}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  )
}
