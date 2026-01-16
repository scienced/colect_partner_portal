import useSWR, { SWRConfiguration } from "swr"
import type { Asset, AssetsResponse, HomepageData } from "@/types"

// Track if we're currently refreshing the session to avoid multiple refreshes
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

/**
 * Attempt to refresh the session using SuperTokens
 * Returns true if refresh succeeded, false otherwise
 */
async function refreshSession(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      // Dynamically import to avoid SSR issues
      const { initSupertokensFrontend } = await import("@/lib/supertokens/frontend")
      const Session = (await import("supertokens-web-js/recipe/session")).default

      initSupertokensFrontend()

      // Check if session exists - this triggers refresh if needed
      const exists = await Session.doesSessionExist()
      return exists
    } catch (error) {
      console.error("Session refresh failed:", error)
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * Session-aware fetcher for SWR
 * Handles 401 errors by refreshing the session and retrying once
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" })

  // If unauthorized, try to refresh the session and retry once
  if (res.status === 401) {
    const refreshed = await refreshSession()

    if (refreshed) {
      // Session refreshed successfully, retry the request
      const retryRes = await fetch(url, { credentials: "include" })

      if (retryRes.ok) {
        return retryRes.json()
      }

      // If still failing after refresh, redirect to login
      if (retryRes.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
        throw new Error("Session expired")
      }

      throw new Error("Failed to fetch data")
    } else {
      // Refresh failed, redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
      throw new Error("Session expired")
    }
  }

  if (!res.ok) {
    const error = new Error("Failed to fetch data")
    throw error
  }

  return res.json()
}

// Default SWR options for the app
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false, // Don't refetch when window regains focus
  revalidateIfStale: false, // Use cache, don't auto-refetch
  dedupingInterval: 60000, // Dedupe requests within 1 minute
  // Disable automatic retries on error - we handle 401 manually
  shouldRetryOnError: false,
  // Don't revalidate on reconnect (avoids multiple requests after offline)
  revalidateOnReconnect: false,
}

// Typed hooks for common data types
export function useAssets(type?: string) {
  const url = type ? `/api/portal/assets?type=${type}` : "/api/portal/assets"
  return useSWR<AssetsResponse>(url, fetcher)
}

export function useDecks() {
  return useSWR<AssetsResponse>("/api/portal/assets?type=DECK", fetcher)
}

export function useVideos() {
  return useSWR<AssetsResponse>("/api/portal/assets?type=VIDEO", fetcher)
}

export function useCampaigns() {
  return useSWR<AssetsResponse>("/api/portal/assets?type=CAMPAIGN", fetcher)
}

export function useGeneralAssets() {
  return useSWR<AssetsResponse>("/api/portal/assets?type=ASSET", fetcher)
}

export function useHomepageData() {
  return useSWR<HomepageData>("/api/portal/homepage", fetcher)
}
