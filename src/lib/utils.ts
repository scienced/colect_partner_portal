import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes without conflicts.
 *
 * Combines clsx (for conditional classes) with tailwind-merge (for deduplication).
 *
 * @example
 * // Basic usage
 * cn("px-4 py-2", "bg-primary")
 * // => "px-4 py-2 bg-primary"
 *
 * @example
 * // Conditional classes
 * cn("base-class", isActive && "active-class", isDisabled && "opacity-50")
 *
 * @example
 * // Override classes (tailwind-merge handles this)
 * cn("px-4", "px-6")
 * // => "px-6" (last one wins)
 *
 * @example
 * // Object syntax
 * cn("base", { "active": isActive, "disabled": isDisabled })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Determine if a date is in the past or future (comparing dates only, not times).
 *
 * @param dateString - ISO date string or null/undefined
 * @returns "past" if the date is before today, "future" if today or later, null if no date
 *
 * @example
 * getDateStatus("2025-01-15") // "past" (if today is 2026-01-22)
 * getDateStatus("2026-02-01") // "future"
 * getDateStatus(null) // null
 */
export function getDateStatus(dateString: string | null | undefined): "past" | "future" | null {
  if (!dateString) return null
  const date = new Date(dateString)
  const now = new Date()
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return dateOnly < nowOnly ? "past" : "future"
}

/**
 * Extract a YouTube video ID from a URL or standalone ID string.
 */
export function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/**
 * Get a YouTube thumbnail URL from a video URL or ID.
 */
export function getYouTubeThumbnail(url: string | null | undefined): string | undefined {
  const id = getYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : undefined
}
