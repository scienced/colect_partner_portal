/**
 * Helpers for working with asset language variants.
 *
 * During the expand phase of the two-phase migration, every asset write
 * dual-populates the legacy Asset.fileUrl / fileType / fileSize / externalLink
 * columns from the default variant. This module centralises that logic.
 */

export interface VariantLike {
  language: string
  fileUrl?: string | null
  fileType?: string | null
  fileSize?: number | null
  externalLink?: string | null
  displayOrder?: number | null
}

/**
 * Default sort: lowest displayOrder first, then alphabetical by language.
 * Stable across calls so the "default variant" for an asset is deterministic.
 */
export function sortVariants<T extends VariantLike>(variants: T[]): T[] {
  return [...variants].sort((a, b) => {
    const aOrder = a.displayOrder ?? 0
    const bOrder = b.displayOrder ?? 0
    if (aOrder !== bOrder) return aOrder - bOrder
    return a.language.localeCompare(b.language)
  })
}

/**
 * Pick the best variant for a given preferred language, falling back to
 * the default variant if the preference isn't available.
 *
 * Lookup order:
 *   1. Exact match on preferred language
 *   2. First variant by (displayOrder, language)
 *   3. undefined (caller must handle empty variants array)
 */
export function pickVariant<T extends VariantLike>(
  variants: T[],
  preferredLanguage?: string | null
): T | undefined {
  if (variants.length === 0) return undefined
  if (preferredLanguage) {
    const target = preferredLanguage.toUpperCase()
    const match = variants.find(v => v.language.toUpperCase() === target)
    if (match) return match
  }
  return sortVariants(variants)[0]
}

/** The default variant — what partners see if they haven't picked a language. */
export function defaultVariant<T extends VariantLike>(variants: T[]): T | undefined {
  return pickVariant(variants, null)
}

/**
 * Project variants → availableLanguages array (sorted, deduplicated, uppercased).
 * This is the denormalised field on Asset that filter queries use.
 */
export function projectAvailableLanguages(variants: VariantLike[]): string[] {
  const set = new Set(variants.map(v => v.language.toUpperCase()))
  return Array.from(set).sort()
}

/**
 * Build the legacy Asset column values from the default variant.
 * Used during the expand phase to keep legacy code paths working
 * and to provide a safe rollback if the deploy goes sideways.
 *
 * If there are no variants, returns all-nulls (asset has no file/link).
 */
export function legacyColumnsFromVariants(
  variants: VariantLike[]
): {
  fileUrl: string | null
  fileType: string | null
  fileSize: number | null
  externalLink: string | null
} {
  const def = defaultVariant(variants)
  if (!def) {
    return { fileUrl: null, fileType: null, fileSize: null, externalLink: null }
  }
  return {
    fileUrl: def.fileUrl ?? null,
    fileType: def.fileType ?? null,
    fileSize: def.fileSize ?? null,
    externalLink: def.externalLink ?? null,
  }
}

/**
 * The canonical list of languages supported by the portal. Adding a new
 * language is a one-place change: update this array and the admin form's
 * language picker / drawer filter / analytics will all pick it up.
 *
 * New entries should be uppercase ISO-639-1 codes.
 */
export const SUPPORTED_LANGUAGES = ["EN", "DE", "FR", "NL"] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

/**
 * Normalise any language input to the canonical uppercase form and validate
 * it against SUPPORTED_LANGUAGES. Accepts "en", "EN", "En", "en-US" → "EN".
 *
 * Throws if the code is not in the supported set — this is the single point
 * where we reject garbage input (and keep the DB from accumulating junk
 * values that would break category filters and the UI).
 */
export function canonicalLanguage(code: string): SupportedLanguage {
  const upper = code.trim().split(/[-_]/)[0].toUpperCase()
  if (!SUPPORTED_LANGUAGES.includes(upper as SupportedLanguage)) {
    throw new Error(
      `Unsupported language code: "${code}". Supported: ${SUPPORTED_LANGUAGES.join(", ")}`
    )
  }
  return upper as SupportedLanguage
}

/**
 * Strip presigned URL query parameters from an S3 URL so we can safely write
 * it back to the database. Presigned URLs look like:
 *   https://bucket.s3.../key/file.pdf?X-Amz-Signature=...&X-Amz-Date=...
 * and the query params expire in 45 minutes. Storing them would double-presign
 * on the next read cycle. This helper keeps only the raw URL up to the `?`.
 *
 * Non-S3 URLs (external links) are returned unchanged.
 */
export function stripPresignQuery(url: string | null | undefined): string | null {
  if (!url) return null
  // Only strip if it's an S3 URL AND has presign params. External links can
  // have legitimate query strings (e.g., YouTube ?v=...) and must be preserved.
  if (!url.includes(".s3.") || !url.includes("amazonaws.com")) return url
  const q = url.indexOf("?")
  return q === -1 ? url : url.slice(0, q)
}
