"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { format } from "date-fns"
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Film,
  Globe,
  ImageIcon,
  Link2,
  Megaphone,
} from "lucide-react"
import { Drawer } from "@/components/ui/Drawer"
import { Button } from "@/components/ui/Button"
import { AudienceBadges } from "@/components/portal/AudienceBadges"
import { ExpandableText } from "@/components/portal/ExpandableText"
import { cn } from "@/lib/utils"
import type { SerializedAdSet } from "@/lib/adSets"
import { adPlatformLabel } from "@/lib/adPlatforms"

type AdCopyItem = SerializedAdSet["copies"][number]


function formatDateTime(dateString: string) {
  try {
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a")
  } catch {
    return dateString
  }
}

/** "Ad 3 – timing: …" → "timing: …" (the "Ad 3 of 6" line already says which ad). */
function labelWithoutAdNumber(label: string): string {
  return label.replace(/^ad\s*\d+\s*[–—:-]\s*/i, "")
}

function copyAsText(c: AdCopyItem): string {
  return [
    c.introText,
    c.headline && `Headline: ${c.headline}`,
    c.description && `Description: ${c.description}`,
    c.ctaLabel && `Call to action: ${c.ctaLabel}`,
    c.destinationUrl && `Link: ${c.destinationUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n")
}

interface AdSetDrawerProps {
  adSet: SerializedAdSet | null
  open: boolean
  onClose: () => void
}

export function AdSetDrawer({ adSet, open, onClose }: AdSetDrawerProps) {
  const [activeVisual, setActiveVisual] = useState(0)
  const [activeCopyId, setActiveCopyId] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [textCopied, setTextCopied] = useState(false)

  const media = useMemo(() => adSet?.media ?? [], [adSet])
  const copies = useMemo(() => adSet?.copies ?? [], [adSet])

  const visibleCopies = copies
  // Most ad sets are "one visual + one copy per ad", numbered the same way.
  // Then the copy simply follows the visual being shown (no version picker).
  // Otherwise (e.g. one image with several copy variants) a compact select.
  const pairedWithVisuals = visibleCopies.length > 1 && visibleCopies.length === media.length
  const activeCopy = pairedWithVisuals
    ? visibleCopies[activeVisual] ?? null
    : visibleCopies.find((c) => c.id === activeCopyId) ?? visibleCopies[0] ?? null

  // Reset when a different ad set opens.
  useEffect(() => {
    if (!adSet || !open) return
    setActiveVisual(0)
    setActiveCopyId(null)
  }, [adSet, open])

  // ← / → step through the visuals while the drawer is open.
  useEffect(() => {
    if (!open || media.length < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return
      if (e.key === "ArrowRight") setActiveVisual((i) => (i + 1) % media.length)
      if (e.key === "ArrowLeft") setActiveVisual((i) => (i - 1 + media.length) % media.length)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, media.length])

  const shareUrl = typeof window !== "undefined" && adSet ? `${window.location.origin}/ads?asset=${adSet.id}` : ""
  const current = media[activeVisual]
  const imageCount = media.filter((m) => m.fileType?.startsWith("image/")).length
  const otherCount = media.length - imageCount

  const copyText = async (text: string, done: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text)
      done(true)
      setTimeout(() => done(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} size="lg">
      {adSet && (
        <>
          {/* Hero — the active visual, full-bleed like the asset drawer. Ads
              are shown whole (object-contain) because cropping a creative
              misrepresents it. */}
          <div className="relative flex-shrink-0 h-64 bg-gray-100 overflow-hidden group/hero">
            {current?.url && current.fileType?.startsWith("image/") ? (
              <>
                {/* Blurred fill behind the creative, so square/portrait ads
                    don't leave empty bars next to the image. */}
                <Image
                  src={current.url}
                  alt=""
                  aria-hidden
                  fill
                  sizes="500px"
                  className="object-cover scale-110 blur-2xl opacity-70"
                  unoptimized
                />
                <Image
                  src={current.url}
                  alt={current.fileName ?? adSet.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-contain"
                  priority
                  unoptimized
                />
              </>
            ) : current?.url && current.fileType?.startsWith("video/") ? (
              <video key={current.id} src={current.url} controls className="w-full h-full object-contain bg-black" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-sky-50">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white/80 text-sky-600">
                  {current ? <FileText className="w-6 h-6" /> : <Megaphone className="w-6 h-6" />}
                </div>
              </div>
            )}

            {/* Category badge — same treatment as decks/campaigns */}
            <div className="absolute top-4 left-4 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/90 backdrop-blur-sm shadow-sm text-sky-700">
                <Megaphone className="w-5 h-5" />
                {adPlatformLabel(adSet.adPlatform)} ad
              </span>
            </div>

            {media.length > 1 && (
              <>
                <div className="absolute top-4 right-14 z-10">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-black/60 text-white">
                    {activeVisual + 1} / {media.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveVisual((i) => (i - 1 + media.length) % media.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-gray-700 opacity-0 group-hover/hero:opacity-100 transition-opacity hover:bg-white"
                  aria-label="Previous visual"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVisual((i) => (i + 1) % media.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-gray-700 opacity-0 group-hover/hero:opacity-100 transition-opacity hover:bg-white"
                  aria-label="Next visual"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Filmstrip */}
          {media.length > 1 && (
            <div className="flex gap-2 px-6 pt-4 overflow-x-auto">
              {media.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveVisual(i)}
                  className={cn(
                    "relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center transition-all",
                    i === activeVisual ? "ring-2 ring-primary ring-offset-1" : "opacity-70 hover:opacity-100"
                  )}
                  aria-label={`Show visual ${i + 1}`}
                >
                  {m.url && m.fileType?.startsWith("image/") ? (
                    <Image src={m.url} alt="" fill sizes="56px" className="object-cover" unoptimized />
                  ) : m.fileType?.startsWith("video/") ? (
                    <Film className="w-5 h-5 text-gray-400" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-6 min-w-0 overflow-x-hidden">
            {/* Title & Description */}
            <div>
              <AudienceBadges visibility={adSet.visibility} brand={adSet.brand} className="mb-2" />
              <h2 className="text-xl font-semibold text-gray-900 leading-tight">{adSet.title}</h2>
              {adSet.description && (
                <ExpandableText key={adSet.id} text={adSet.description} className="text-gray-600 mt-2 leading-relaxed" />
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/portal/ads/${adSet.id}/download`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium bg-primary text-white hover:bg-primary/90"
              >
                <Download className="w-4 h-4" />
                Download all (ZIP)
              </a>
              {current?.url && (
                <a
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open this visual
                </a>
              )}
            </div>

            {/* Ad copy — kept light: which ad, a 3-line preview, one copy button.
                The full copy of every ad is in Download all (copy.txt). */}
            {activeCopy && (
              <div className="space-y-2">
                {!pairedWithVisuals && visibleCopies.length > 1 && (
                  <select
                    value={activeCopy.id}
                    onChange={(e) => setActiveCopyId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                    aria-label="Copy version"
                  >
                    {visibleCopies.map((c, i) => (
                      <option key={c.id} value={c.id}>
                        {(c.label || `Version ${String.fromCharCode(65 + i)}`) + (c.language ? ` (${c.language})` : "")}
                      </option>
                    ))}
                  </select>
                )}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm min-w-0 break-words">
                    <span className="font-medium text-gray-900">
                      {pairedWithVisuals ? `Ad ${activeVisual + 1} of ${media.length}` : "Ad copy"}
                    </span>
                    {activeCopy.label && (
                      <span className="text-gray-500">
                        {" · "}
                        {pairedWithVisuals ? labelWithoutAdNumber(activeCopy.label) : activeCopy.label}
                      </span>
                    )}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 whitespace-pre-line break-words [overflow-wrap:anywhere] line-clamp-3">
                    {activeCopy.introText}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">Full copy of every ad is in the ZIP</span>
                    <Button variant="secondary" size="sm" onClick={() => copyText(copyAsText(activeCopy), setTextCopied)}>
                      {textCopied ? (
                        <>
                          <Check className="w-4 h-4 mr-1 text-green-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy ad text
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <ImageIcon className="w-4 h-4" />
                  <span>Visuals</span>
                </div>
                <p className="text-gray-900 text-sm">
                  {imageCount > 0 && `${imageCount} image${imageCount === 1 ? "" : "s"}`}
                  {imageCount > 0 && otherCount > 0 && " · "}
                  {otherCount > 0 && `${otherCount} other`}
                  {media.length > 1 && " · carousel order"}
                </p>
              </div>
              {adSet.availableLanguages.length > 0 && (
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Globe className="w-4 h-4" />
                    <span>Languages</span>
                  </div>
                  <p className="text-gray-900 text-sm">{adSet.availableLanguages.join(", ")}</p>
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
                  <p className="text-gray-700 text-sm">{formatDateTime(adSet.createdAt)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Updated</span>
                  </div>
                  <p className="text-gray-700 text-sm">{formatDateTime(adSet.updatedAt)}</p>
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
                <Button variant="secondary" size="sm" onClick={() => copyText(shareUrl, setLinkCopied)} className="flex-shrink-0">
                  {linkCopied ? (
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
