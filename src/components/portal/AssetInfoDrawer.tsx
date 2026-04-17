"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { format } from "date-fns"
import { Drawer } from "@/components/ui/Drawer"
import { Button } from "@/components/ui/Button"
import {
  FileText,
  Play,
  Mail,
  ExternalLink,
  BookOpen,
  Calendar,
  Clock,
  Users,
  Link2,
  Check,
  Copy,
  Download,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAnalytics } from "@/hooks/useAnalytics"
import { defaultVariant as pickDefaultVariant, canonicalLanguage } from "@/lib/assetVariants"
import type { AssetInfo, AssetVariant } from "@/types"

const LANG_PREFERENCE_KEY = "portal:preferred-language"

/** Pick the initial language for the drawer: localStorage → navigator → default variant. */
function pickInitialLanguage(asset: AssetInfo): string {
  const available = asset.availableLanguages || []
  if (available.length === 0) return "EN"

  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(LANG_PREFERENCE_KEY)
    if (stored && available.includes(stored)) return stored

    const browser = window.navigator.language?.split("-")[0]?.toUpperCase()
    if (browser && available.includes(browser)) return browser
  }

  // Fall back to the server-computed default variant
  const def = pickDefaultVariant(asset.variants ?? [])
  if (def) return def.language
  return available[0]
}

// Helper to extract file extension from URL
function getFileExtension(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const pathname = new URL(url, "https://example.com").pathname
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/)
    if (match) {
      return match[1].toUpperCase()
    }
  } catch {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
    if (match) {
      return match[1].toUpperCase()
    }
  }
  return null
}

interface AssetInfoDrawerProps {
  asset: AssetInfo | null
  open: boolean
  onClose: () => void
}

const categoryConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  deck: {
    icon: <FileText className="w-5 h-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  video: {
    icon: <Play className="w-5 h-5" />,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  campaign: {
    icon: <Mail className="w-5 h-5" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  asset: {
    icon: <ExternalLink className="w-5 h-5" />,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
  },
  docs: {
    icon: <BookOpen className="w-5 h-5" />,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
}

export function AssetInfoDrawer({ asset, open, onClose }: AssetInfoDrawerProps) {
  const [copied, setCopied] = useState(false)
  const [activeLanguage, setActiveLanguage] = useState<string>("EN")
  // Cache of presigned variant data keyed by language. Populated from:
  // 1. The API's pre-resolved default variant (asset.fileUrl / asset.externalLink)
  // 2. On-demand fetches of /api/portal/assets/{id}/variant?language=XX
  const [variantCache, setVariantCache] = useState<Record<string, { fileUrl: string | null; externalLink: string | null }>>({})
  const [variantLoading, setVariantLoading] = useState(false)
  const { trackAssetDownload, trackAssetClick } = useAnalytics()

  const category = asset?.category || asset?.type?.toLowerCase() || "asset"
  const config = categoryConfig[category] || categoryConfig.asset

  const shareUrl = typeof window !== "undefined" && asset
    ? `${window.location.origin}${window.location.pathname}?asset=${asset.id}`
    : ""

  // When the drawer opens for a new asset, seed the active language from preferences
  // and seed the cache with the API-resolved default variant.
  useEffect(() => {
    if (!asset || !open) return
    const initial = pickInitialLanguage(asset)
    setActiveLanguage(initial)

    // The API pre-resolved the default variant into asset.fileUrl/externalLink.
    // Determine which language that was so we can seed the cache without another fetch.
    const serverDefault = pickDefaultVariant(asset.variants ?? [])
    if (serverDefault) {
      setVariantCache({
        [serverDefault.language]: {
          fileUrl: asset.fileUrl ?? null,
          externalLink: asset.externalLink ?? null,
        },
      })
    } else {
      setVariantCache({})
    }
  }, [asset, open])

  // Fetch the presigned URL for a non-default variant when the user switches to it.
  useEffect(() => {
    if (!asset || !activeLanguage) return
    // DOCS items never have asset variants — don't try to fetch them.
    if (asset.type === "DOCS") return
    if (variantCache[activeLanguage]) return
    // No cached entry yet — fetch it.
    let cancelled = false
    setVariantLoading(true)
    fetch(`/api/portal/assets/${asset.id}/variant?language=${encodeURIComponent(activeLanguage)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`variant fetch failed: ${r.status}`)
        return r.json()
      })
      .then((data: AssetVariant & { fileUrl: string | null; externalLink: string | null }) => {
        if (cancelled) return
        setVariantCache((prev) => ({
          ...prev,
          [activeLanguage]: {
            fileUrl: data.fileUrl ?? null,
            externalLink: data.externalLink ?? null,
          },
        }))
      })
      .catch((err) => {
        console.error("Failed to fetch variant:", err)
      })
      .finally(() => {
        if (!cancelled) setVariantLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [asset, activeLanguage, variantCache])

  // Persist preference when user explicitly switches language.
  const changeLanguage = (lang: string) => {
    const canonical = canonicalLanguage(lang)
    setActiveLanguage(canonical)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANG_PREFERENCE_KEY, canonical)
    }
  }

  // Active variant's file/link — either from cache (default) or server response (fetched)
  const active = useMemo(() => {
    return variantCache[activeLanguage] ?? { fileUrl: null, externalLink: null }
  }, [variantCache, activeLanguage])

  const availableLanguages = asset?.availableLanguages || []
  const hasLanguageToggle = availableLanguages.length > 1

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a")
    } catch {
      return dateString
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
    >
      {asset && (
      <>
        {/* Hero Section with Thumbnail.
            Uses explicit h-64 + overflow-hidden instead of aspect-video because
            aspect-ratio interacts poorly with Next.js <Image fill> inside a
            flex-column scroll container — the image renders at its natural
            height instead of being cropped. */}
        <div className="relative flex-shrink-0 h-64 bg-gray-100 overflow-hidden">
          {asset.thumbnailUrl ? (
            <Image
              src={asset.thumbnailUrl}
              alt={asset.title}
              fill
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-cover"
              priority
              placeholder={asset.blurDataUrl ? "blur" : undefined}
              blurDataURL={asset.blurDataUrl || undefined}
              unoptimized
            />
          ) : (
            <div className={cn(
              "w-full h-full flex items-center justify-center",
              config.bgColor
            )}>
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center bg-white/80", config.color)}>
                {config.icon}
              </div>
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute top-4 left-4 z-10">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/90 backdrop-blur-sm shadow-sm",
              config.color
            )}>
              {config.icon}
              <span className="capitalize">{category}</span>
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
            {/* Title & Description */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 leading-tight">
                {asset.title}
              </h2>
              {asset.description && (
                <p className="text-gray-600 mt-2 leading-relaxed">
                  {asset.description}
                </p>
              )}
            </div>

            {/* DOCS — documentation entries get a single "Open Documentation"
                CTA and a clear origin line. No language toggle, no variant
                fetching (docs have neither). */}
            {asset.type === "DOCS" ? (
              <>
                {asset.spaceLabel && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <BookOpen className="w-4 h-4" />
                    <span>
                      From <span className="font-medium text-gray-700">{asset.spaceLabel}</span>
                      {asset.spaceName && asset.spaceName !== asset.spaceLabel
                        ? ` · ${asset.spaceName}`
                        : ""}
                    </span>
                    {asset.isNew && (
                      <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-700">
                        New
                      </span>
                    )}
                  </div>
                )}
                {asset.externalLink && (
                  <div>
                    <a
                      href={asset.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium bg-primary text-white hover:bg-primary/90"
                      onMouseDown={() =>
                        trackAssetClick(asset.id, asset.title, asset.type)
                      }
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Documentation
                    </a>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Language Toggle (visible when more than one language is available) */}
                {hasLanguageToggle && (
                  <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
                    {availableLanguages.map((lang: string) => {
                      const isActive = lang === activeLanguage
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => changeLanguage(lang)}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                            isActive
                              ? "bg-white text-primary shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                        >
                          {lang}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Quick Actions — reflect the currently selected language variant */}
                <div className="flex flex-wrap gap-2">
                  {active.fileUrl && (
                    <a
                      href={active.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                        variantLoading
                          ? "bg-primary/60 text-white cursor-wait"
                          : "bg-primary text-white hover:bg-primary/90"
                      )}
                      onMouseDown={() =>
                        trackAssetDownload(asset.id, asset.title, asset.type, activeLanguage)
                      }
                    >
                      <Download className="w-4 h-4" />
                      Download{getFileExtension(active.fileUrl) ? ` ${getFileExtension(active.fileUrl)}` : ""}
                    </a>
                  )}
                  {active.externalLink && (
                    <a
                      href={active.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                        active.fileUrl
                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          : "bg-primary text-white hover:bg-primary/90"
                      )}
                      onMouseDown={() =>
                        trackAssetClick(asset.id, asset.title, asset.type, activeLanguage)
                      }
                    >
                      <ExternalLink className="w-4 h-4" />
                      {category === "deck" ? "View Slides" : "Open Link"}
                    </a>
                  )}
                  {!active.fileUrl && !active.externalLink && variantLoading && (
                    <span className="text-sm text-gray-500">Loading {activeLanguage} version…</span>
                  )}
                </div>
              </>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Personas */}
              {asset.persona && asset.persona.length > 0 && (
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Users className="w-4 h-4" />
                    <span>Target Personas</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {asset.persona.map((p) => (
                      <span
                        key={p}
                        className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-sm font-medium"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Campaign Goal */}
              {asset.campaignGoal && (
                <div className="col-span-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Target className="w-4 h-4" />
                    <span>Campaign Goal</span>
                  </div>
                  <p className="text-gray-900">{asset.campaignGoal}</p>
                </div>
              )}

              {/* Sent Date (for campaigns) */}
              {asset.sentAt && (
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Mail className="w-4 h-4" />
                    <span>Sent</span>
                  </div>
                  <p className="text-gray-900 text-sm">{formatDateTime(asset.sentAt)}</p>
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Created</span>
                  </div>
                  <p className="text-gray-700 text-sm">{formatDateTime(asset.createdAt)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Updated</span>
                  </div>
                  <p className="text-gray-700 text-sm">{formatDateTime(asset.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Share Link */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Link2 className="w-4 h-4" />
                <span>Share Link</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 truncate font-mono">
                  {shareUrl}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
        </div>
      </>
      )}
    </Drawer>
  )
}

export default AssetInfoDrawer
