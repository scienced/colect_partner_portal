/**
 * Shared TypeScript types for the Partner Portal
 */

// Asset types matching Prisma schema
export type AssetType = "DECK" | "CAMPAIGN" | "ASSET" | "VIDEO"

// One language version of an asset (file or link)
export interface AssetVariant {
  id: string
  assetId: string
  language: string // "EN", "FR", "DE", "NL"
  fileUrl: string | null
  fileType: string | null
  fileSize: number | null
  externalLink: string | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}

// Shape sent to the admin API when creating/updating variants (no id for new rows)
export interface AssetVariantInput {
  id?: string
  language: string
  fileUrl?: string | null
  fileType?: string | null
  fileSize?: number | null
  externalLink?: string | null
  displayOrder?: number
}

export interface Asset {
  id: string
  type: AssetType
  title: string
  description: string | null
  thumbnailUrl: string | null
  blurDataUrl: string | null

  // Languages available for this asset (denormalized from variants, used for filtering)
  availableLanguages: string[]

  // Language variants — one per language version
  variants?: AssetVariant[]

  // LEGACY file fields — still present on Asset during expand phase.
  // Dual-populated from the default variant. Read-only for new code;
  // dropped in a follow-up migration after production bake.
  fileUrl: string | null
  thumbnailPresigned?: string | null
  fileType: string | null
  fileSize: number | null
  externalLink: string | null

  region: string[]
  persona: string[]
  campaignGoal: string | null
  campaignLink: string | null
  templateContent: string | null
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
  // Default variant fields (pre-resolved server-side so the drawer has something to show immediately)
  fileUrl?: string | null
  externalLink?: string | null
  availableLanguages?: string[]
  variants?: AssetVariant[]
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

  // Default variant, pre-resolved server-side
  fileUrl?: string | null
  externalLink?: string | null

  // All variants, so the drawer can render a language toggle
  variants?: AssetVariant[]
  availableLanguages?: string[]

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
