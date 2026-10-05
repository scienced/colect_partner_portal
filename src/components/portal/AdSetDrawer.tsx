"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Download, ExternalLink, FileText, Film } from "lucide-react"
import { Drawer } from "@/components/ui/Drawer"
import { AudienceBadges } from "@/components/portal/AudienceBadges"
import { cn } from "@/lib/utils"
import type { SerializedAdSet } from "@/lib/adSets"

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border transition-colors flex-shrink-0",
        copied ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-600 hover:text-primary hover:border-primary/40"
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </button>
  )
}

function CopyField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <CopyButton text={value} />
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-line">{value}</p>
    </div>
  )
}

function copyAsText(c: SerializedAdSet["copies"][number]): string {
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
  onDownload?: (adSet: SerializedAdSet) => void
}

export function AdSetDrawer({ adSet, open, onClose, onDownload }: AdSetDrawerProps) {
  const [active, setActive] = useState(0)
  useEffect(() => setActive(0), [adSet?.id])

  if (!adSet) return null
  const current = adSet.media[active]

  return (
    <Drawer open={open} onClose={onClose} title={adSet.title} size="xl">
      <div className="space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">LinkedIn</span>
          <AudienceBadges visibility={adSet.visibility} brand={adSet.brand} />
        </div>
        {adSet.description && <p className="text-sm text-gray-600">{adSet.description}</p>}

        {/* Gallery */}
        {current && (
          <div>
            <div className="rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center aspect-[4/3]">
              {current.fileType?.startsWith("image/") && current.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.url} alt={current.fileName ?? ""} className="max-w-full max-h-full object-contain" />
              ) : current.fileType?.startsWith("video/") && current.url ? (
                <video src={current.url} controls className="max-w-full max-h-full" />
              ) : (
                <div className="text-center text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">{current.fileName}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>
                {active + 1} / {adSet.media.length} · {current.fileName}
              </span>
              {current.url && (
                <a href={current.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="w-3 h-3" /> Open original
                </a>
              )}
            </div>
            {adSet.media.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {adSet.media.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActive(i)}
                    className={cn(
                      "w-16 h-16 rounded-md overflow-hidden border-2 flex-shrink-0 bg-gray-50 flex items-center justify-center",
                      i === active ? "border-primary" : "border-transparent hover:border-gray-300"
                    )}
                    aria-label={`Show visual ${i + 1}`}
                  >
                    {m.fileType?.startsWith("image/") && m.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    ) : m.fileType?.startsWith("video/") ? (
                      <Film className="w-5 h-5 text-gray-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <a
          href={`/api/portal/social-ads/${adSet.id}/download`}
          onClick={() => onDownload?.(adSet)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download all ({adSet.media.length} visual{adSet.media.length === 1 ? "" : "s"}{adSet.copies.length ? " + copy" : ""}, .zip)
        </a>

        {/* Copy versions */}
        {adSet.copies.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Copy</h3>
            {adSet.copies.map((c, i) => (
              <div key={c.id} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {c.label || `Version ${String.fromCharCode(65 + i)}`}
                    {c.language && <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{c.language}</span>}
                  </span>
                  <CopyButton text={copyAsText(c)} label="Copy all" />
                </div>
                <CopyField label="Intro text" value={c.introText} />
                <CopyField label="Headline" value={c.headline} />
                <CopyField label="Description" value={c.description} />
                <div className="flex flex-wrap gap-4 text-sm">
                  {c.ctaLabel && (
                    <span>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-1">CTA</span>
                      {c.ctaLabel}
                    </span>
                  )}
                  {c.destinationUrl && (
                    <a href={c.destinationUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                      {c.destinationUrl}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  )
}
