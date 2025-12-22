import useSWR, { SWRConfiguration } from "swr"

// Default fetcher for SWR
export const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" })

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
}

// Typed hooks for common data types
export function useAssets(type?: string) {
  const url = type ? `/api/portal/assets?type=${type}` : "/api/portal/assets"
  return useSWR<{ assets: any[] }>(url, fetcher)
}

export function useDecks() {
  return useSWR<{ assets: any[] }>("/api/portal/assets?type=DECK", fetcher)
}

export function useVideos() {
  return useSWR<{ assets: any[] }>("/api/portal/assets?type=VIDEO", fetcher)
}

export function useCampaigns() {
  return useSWR<{ assets: any[] }>("/api/portal/assets?type=CAMPAIGN", fetcher)
}

export function useGeneralAssets() {
  return useSWR<{ assets: any[] }>("/api/portal/assets?type=ASSET", fetcher)
}

export function useDocsUpdates() {
  return useSWR<{ updates: any[] }>("/api/portal/docs-updates", fetcher)
}

export function useTeamMembers() {
  return useSWR<{ members: any[] }>("/api/portal/team-members", fetcher)
}

export function useHomepageData() {
  return useSWR<{
    featured: any[]
    decks: any[]
    videos: any[]
    campaigns: any[]
    assets: any[]
    docsUpdates: any[]
    recentlyUpdated: any[]
  }>("/api/portal/homepage", fetcher)
}
