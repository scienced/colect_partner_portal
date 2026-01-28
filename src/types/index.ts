/**
 * Shared TypeScript types for the Partner Portal
 */

// Asset types matching Prisma schema
export type AssetType = "DECK" | "CAMPAIGN" | "ASSET" | "VIDEO"

export interface Asset {
  id: string
  type: AssetType
  title: string
  description: string | null
  fileUrl: string | null
  thumbnailUrl: string | null
  blurDataUrl: string | null
  fileType: string | null
  fileSize: number | null
  region: string[]
  language: string[]
  persona: string[]
  campaignGoal: string | null
  campaignLink: string | null
  templateContent: string | null
  externalLink: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  // Pinning
  isPinned?: boolean
  pinnedAt?: string | null
  pinExpiresAt?: string | null
  pinOrder?: number
}

// Docs update matching Prisma schema
export interface DocsUpdate {
  id: string
  title: string
  summary: string
  deepLink: string
  category: string | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  // Pinning
  isPinned?: boolean
  pinnedAt?: string | null
  pinExpiresAt?: string | null
  pinOrder?: number
}

// Search result categories
export type SearchCategory = "asset" | "docs" | "product" | "team"

// Search result from /api/search
export interface SearchResult {
  id: string
  title: string
  subtitle?: string
  category: SearchCategory
  href: string
  external?: boolean
  // Asset-specific fields (when category is "asset")
  type?: AssetType
  description?: string | null
  thumbnailUrl?: string | null
  blurDataUrl?: string | null
  fileUrl?: string | null
  externalLink?: string | null
  language?: string[]
  persona?: string[]
  campaignGoal?: string | null
  sentAt?: string | null
  createdAt?: string
  updatedAt?: string
}

// Featured item from homepage API
export interface FeaturedItem {
  id: string
  title: string
  description: string | null
  thumbnailUrl?: string | null
  href: string
  external?: boolean
  category: string
  asset: AssetDrawerData | null
}

// Asset info used in the drawer and section pages
export interface AssetInfo {
  id: string
  title: string
  description?: string | null
  type: string
  category?: string
  thumbnailUrl?: string | null
  blurDataUrl?: string | null
  fileUrl?: string | null
  externalLink?: string | null
  language?: string[]
  persona?: string[]
  campaignGoal?: string | null
  sentAt?: string | null
  createdAt: string
  updatedAt: string
}

// Asset data structure used in the drawer component (alias for backwards compat)
export type AssetDrawerData = AssetInfo

// Homepage API response
export interface HomepageData {
  featured: FeaturedItem[]
  decks: Asset[]
  videos: Asset[]
  campaigns: Asset[]
  assets: Asset[]
  docsUpdates: DocsUpdate[]
  recentlyUpdated: (Asset & { _type?: "asset" | "docs" })[]
}

// Assets API response
export interface AssetsResponse {
  assets: Asset[]
  total?: number
}

// Search API response
export interface SearchResponse {
  results: SearchResult[]
  error?: string
}
