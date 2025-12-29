"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useAnalytics } from "@/hooks/useAnalytics"

/**
 * Component that automatically tracks page views
 * Place this in the portal layout to track all page navigation
 */
export function AnalyticsTracker() {
  const pathname = usePathname()
  const { trackPageView } = useAnalytics()

  useEffect(() => {
    // Track page view when pathname changes
    if (pathname) {
      trackPageView(pathname)
    }
  }, [pathname, trackPageView])

  // This component doesn't render anything
  return null
}
