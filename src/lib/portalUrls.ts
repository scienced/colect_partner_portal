import type { AssetType } from "@prisma/client"

/**
 * Presigned download URLs are signed for 60 min, but the in-memory cache can
 * serve a URL up to ~45 min after signing. That worst case leaves ≥15 min of
 * validity, so we report a conservative 15-min expiry — agents re-fetch when
 * they need the URL beyond that.
 */
export const DOWNLOAD_URL_VALID_FOR_MS = 15 * 60 * 1000

/**
 * Direct-consumption block attached to every asset response. Tells an AI
 * agent exactly how to fetch the underlying file: a presigned S3 URL for
 * downloadable assets, an `externalLink` for assets that live elsewhere
 * (e.g. YouTube videos), or `null` if the asset has no variant yet.
 */
export interface AssetDownloadInfo {
  url: string | null
  externalLink: string | null
  expiresAt: string | null
  fileType: string | null
  fileSize: number | null
  language: string | null
}

/**
 * Build a deep-link URL into the portal for an asset. The portal's listing
 * pages already honour `?asset=<id>` via the useAssetDrawer hook — opening
 * the asset drawer on top of the matching category page.
 */
export function assetPortalUrl(origin: string, type: AssetType | string, id?: string): string {
  const base = (() => {
    switch (type) {
      case "DECK": return `${origin}/decks`
      case "CAMPAIGN": return `${origin}/campaigns`
      case "VIDEO": return `${origin}/videos`
      case "SOCIAL_AD": return `${origin}/ads`
      default: return `${origin}/assets`
    }
  })()
  return id ? `${base}?asset=${encodeURIComponent(id)}` : base
}
