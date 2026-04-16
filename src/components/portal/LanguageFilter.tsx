"use client"

import { Globe } from "lucide-react"
import { cn } from "@/lib/utils"

interface LanguageFilterProps {
  availableLanguages: string[]
  activeLanguage: string | null
  onChange: (language: string | null) => void
  className?: string
}

/**
 * Pill-group filter for selecting which language of content to show on a
 * category page. "All" is always first; other options are the union of
 * languages that exist across the visible assets.
 *
 * Hidden entirely when there's 0 or 1 distinct language — there's nothing
 * to filter by.
 */
export function LanguageFilter({
  availableLanguages,
  activeLanguage,
  onChange,
  className,
}: LanguageFilterProps) {
  const sorted = Array.from(new Set(availableLanguages)).sort()
  if (sorted.length < 2) return null

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Globe className="w-4 h-4 text-gray-400" />
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-1">
        Language
      </span>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "px-3 py-1 rounded-full text-xs font-medium transition-colors",
          activeLanguage === null
            ? "bg-primary text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        )}
      >
        All
      </button>
      {sorted.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-colors",
            activeLanguage === lang
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
