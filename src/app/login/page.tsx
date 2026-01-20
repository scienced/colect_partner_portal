"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { createCode } from "supertokens-web-js/recipe/passwordless"
import Session from "supertokens-web-js/recipe/session"
import { initSupertokensFrontend } from "@/lib/supertokens/frontend"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card } from "@/components/ui/Card"
import { Mail, ArrowRight, CheckCircle, Loader2 } from "lucide-react"

type LoginState = "email" | "sent" | "verifying" | "error"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [state, setState] = useState<LoginState>("email")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initSupertokensFrontend()

    // Check if user already has a valid session
    const checkSession = async () => {
      try {
        const sessionExists = await Session.doesSessionExist()
        if (sessionExists) {
          // User is already logged in, redirect to home or the intended destination
          const redirectTo = searchParams.get("redirect") || "/"
          router.replace(redirectTo)
          return
        }
      } catch (err) {
        // Session check failed, show login form
        console.error("Session check error:", err)
      }
      setReady(true)
    }

    checkSession()
  }, [router, searchParams])

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await createCode({
        email,
      })

      if (response.status === "OK") {
        setState("sent")
      } else {
        setError("Something went wrong. Please try again.")
        setState("error")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Failed to send magic link. Please try again.")
      setState("error")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setState("email")
    setError(null)
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Image
              src="/colect-logo.png"
              alt="Colect"
              width={48}
              height={48}
              className="rounded-xl"
              priority
            />
            <h1 className="text-2xl font-bold text-gray-900">Colect</h1>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold bg-primary/10 text-primary">
            Partner Portal
          </span>
        </div>

        <Card padding="lg" className="shadow-lg">
          {state === "email" || state === "error" ? (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Sign in to your account
                </h2>
                <p className="text-gray-600 mt-2">
                  Enter your email to receive a magic link
                </p>
              </div>

              <form onSubmit={handleSubmitEmail} className="space-y-4">
                <Input
                  type="email"
                  label="Email address"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error || undefined}
                  required
                  disabled={loading}
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={loading}
                  iconAfter={<ArrowRight className="w-4 h-4" />}
                >
                  Send magic link
                </Button>
              </form>

              <p className="text-sm text-gray-500 text-center mt-6">
                By signing in, you agree to our Terms of Service and Privacy
                Policy.
              </p>
            </>
          ) : state === "sent" ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Check your email
              </h2>
              <p className="text-gray-600 mb-6">
                We&apos;ve sent a magic link to{" "}
                <span className="font-medium text-gray-900">{email}</span>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Click the link in the email to sign in. The link will expire in
                15 minutes.
              </p>
              <Button
                variant="secondary"
                onClick={handleResend}
                className="w-full"
              >
                Use a different email
              </Button>
            </div>
          ) : state === "verifying" ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">
                Verifying...
              </h2>
              <p className="text-gray-600 mt-2">
                Please wait while we sign you in.
              </p>
            </div>
          ) : null}
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          Need help?{" "}
          <a
            href="mailto:support@colect.com"
            className="text-primary hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}
