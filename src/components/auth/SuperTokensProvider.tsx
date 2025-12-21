"use client"

import { useEffect, useState } from "react"
import { initSupertokensFrontend } from "@/lib/supertokens/frontend"

export function SuperTokensProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    initSupertokensFrontend()
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by only rendering children after mount
  if (!mounted) {
    return null
  }

  return <>{children}</>
}
