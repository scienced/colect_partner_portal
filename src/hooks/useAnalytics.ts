"use client"

import { useCallback, useRef } from "react"

type EventType = "PAGE_VIEW" | "ASSET_CLICK" | "ASSET_DOWNLOAD" | "SEARCH_QUERY"

interface TrackEventOptions {
  type: EventType
  pagePath?: string
  assetId?: string
  assetTitle?: string
  assetType?: string
  searchQuery?: string
}

/**
 * Hook for tracking analytics events
 */
export function useAnalytics() {
  // Track which page views have been sent to avoid duplicates
  const sentPageViews = useRef<Set<string>>(new Set())

  const trackEvent = useCallback(async (options: TrackEventOptions) => {
    try {
      await fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })
    } catch (error) {
      // Silently fail - analytics shouldn't break the user experience
      console.error("Failed to track event:", error)
    }
  }, [])

  const trackPageView = useCallback(
    async (pagePath: string) => {
      // Prevent duplicate page views in the same session
      if (sentPageViews.current.has(pagePath)) {
        return
      }
      sentPageViews.current.add(pagePath)

      await trackEvent({
        type: "PAGE_VIEW",
        pagePath,
      })
    },
    [trackEvent]
  )

  const trackAssetClick = useCallback(
    async (assetId: string, assetTitle: string, assetType: string) => {
      await trackEvent({
        type: "ASSET_CLICK",
        assetId,
        assetTitle,
        assetType,
      })
    },
    [trackEvent]
  )

  const trackAssetDownload = useCallback(
    async (assetId: string, assetTitle: string, assetType: string) => {
      await trackEvent({
        type: "ASSET_DOWNLOAD",
        assetId,
        assetTitle,
        assetType,
      })
    },
    [trackEvent]
  )

  const trackSearch = useCallback(
    async (searchQuery: string) => {
      await trackEvent({
        type: "SEARCH_QUERY",
        searchQuery,
      })
    },
    [trackEvent]
  )

  return {
    trackPageView,
    trackAssetClick,
    trackAssetDownload,
    trackSearch,
    trackEvent,
  }
}
