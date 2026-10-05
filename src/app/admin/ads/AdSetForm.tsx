"use client"

import { useEffect, useRef, useState } from "react"
import type { ContentBrand, AssetVisibility } from "@prisma/client"
import { Button } from "@/components/ui/Button"
import { Input, Textarea, Select, Checkbox } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { ArrowLeft, ArrowRight, FileText, Film, Lock, Plus, Trash2, Upload, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { SUPPORTED_LANGUAGES } from "@/lib/assetVariants"
import { AD_MEDIA_ACCEPT, expandFiles, uploadAdMedia } from "@/lib/adMediaUpload"
import type { SerializedAdSet } from "@/lib/adSets"
import { AD_PLATFORM_OPTIONS } from "@/lib/adPlatforms"

// Common call-to-action button labels (LinkedIn's set covers most platforms).
const CTA_OPTIONS = [
  "Learn more", "Request demo", "Download", "Sign up", "Register", "Subscribe",
  "Apply", "Get quote", "Join", "Attend", "Contact us", "View quote",
]

interface MediaItem {
  key: string
  fileUrl: string | null // raw storage URL once uploaded
  previewUrl: string | null
  fileName: string
  fileType: string
  status: "uploading" | "done" | "error"
  error?: string
}

interface CopyItem {
  key: string
  label: string
  language: string
  introText: string
  headline: string
  description: string
  ctaLabel: string
  destinationUrl: string
}

let keySeq = 0
const nextKey = () => `k${++keySeq}`

const emptyCopy = (): CopyItem => ({
  key: nextKey(),
  label: "",
  language: "",
  introText: "",
  headline: "",
  description: "",
  ctaLabel: "Learn more",
  destinationUrl: "",
})

function initialMedia(adSet?: SerializedAdSet | null): MediaItem[] {
  return (adSet?.media ?? []).map((m) => ({
    key: nextKey(),
    fileUrl: m.fileUrl,
    previewUrl: m.url,
    fileName: m.fileName ?? "visual",
    fileType: m.fileType ?? "",
    status: "done",
  }))
}

function initialCopies(adSet?: SerializedAdSet | null): CopyItem[] {
  if (!adSet?.copies.length) return [emptyCopy()]
  return adSet.copies.map((c) => ({
    key: nextKey(),
    label: c.label ?? "",
    language: c.language ?? "",
    introText: c.introText,
    headline: c.headline ?? "",
    description: c.description ?? "",
    ctaLabel: c.ctaLabel ?? "",
    destinationUrl: c.destinationUrl ?? "",
  }))
}

interface AdSetFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  initialData?: SerializedAdSet | null
}

export function AdSetForm({ open, onClose, onSubmit, initialData }: AdSetFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<AssetVisibility>("EMPLOYEES")
  const [brand, setBrand] = useState<ContentBrand | "">("")
  const [platform, setPlatform] = useState<string>("LINKEDIN")
  const [publish, setPublish] = useState(false)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [copies, setCopies] = useState<CopyItem[]>([emptyCopy()])
  const [dragOver, setDragOver] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Reset whenever the modal opens (new or a different ad set)
  useEffect(() => {
    if (!open) return
    setTitle(initialData?.title ?? "")
    setDescription(initialData?.description ?? "")
    setVisibility((initialData?.visibility as AssetVisibility) ?? "EMPLOYEES")
    setBrand((initialData?.brand as ContentBrand) ?? "")
    setPlatform(initialData?.adPlatform ?? "LINKEDIN")
    setPublish(initialData ? initialData.published : false)
    setMedia(initialMedia(initialData))
    setCopies(initialCopies(initialData))
    setNotice(null)
  }, [open, initialData])

  const uploading = media.some((m) => m.status === "uploading")

  async function addFiles(files: File[]) {
    setNotice(null)
    let expanded: Awaited<ReturnType<typeof expandFiles>>
    try {
      expanded = await expandFiles(files)
    } catch {
      setNotice("Couldn't read that zip file.")
      return
    }
    if (expanded.skipped.length) {
      setNotice(`Skipped ${expanded.skipped.length} file(s) that aren't images, videos or PDFs: ${expanded.skipped.slice(0, 5).join(", ")}`)
    }
    const items: MediaItem[] = expanded.media.map((file) => ({
      key: nextKey(),
      fileUrl: null,
      previewUrl: URL.createObjectURL(file),
      fileName: file.name,
      fileType: file.type,
      status: "uploading",
    }))
    setMedia((prev) => [...prev, ...items])

    // Upload a few at a time so a 30-image zip doesn't open 30 connections.
    const queue = expanded.media.map((file, i) => ({ file, key: items[i].key }))
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const { file, key } = job
        try {
          const fileUrl = await uploadAdMedia(file)
          setMedia((prev) => prev.map((m) => (m.key === key ? { ...m, fileUrl, status: "done" } : m)))
        } catch (e) {
          const error = e instanceof Error ? e.message : "Upload failed"
          setMedia((prev) => prev.map((m) => (m.key === key ? { ...m, status: "error", error } : m)))
        }
      }
    }
    await Promise.all([worker(), worker(), worker()])
  }

  function moveMedia(index: number, delta: number) {
    setMedia((prev) => {
      const next = [...prev]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function updateCopy(key: string, patch: Partial<CopyItem>) {
    setCopies((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  }

  const handleSubmit = async () => {
    const ready = media.filter((m) => m.status === "done" && m.fileUrl)
    if (!title.trim()) return setNotice("Give the ad set a title.")
    if (ready.length === 0) return setNotice("Add at least one visual.")
    if (media.some((m) => m.status === "error")) return setNotice("Remove the visuals that failed to upload first.")
    const filledCopies = copies.filter((c) => c.introText.trim())

    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        visibility,
        brand: brand || null,
        adPlatform: platform,
        publish,
        media: ready.map((m) => ({ fileUrl: m.fileUrl, fileName: m.fileName })),
        copies: filledCopies.map((c) => ({
          label: c.label || null,
          language: c.language || null,
          introText: c.introText,
          headline: c.headline || null,
          description: c.description || null,
          ctaLabel: c.ctaLabel || null,
          destinationUrl: c.destinationUrl || null,
        })),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Edit ad set" : "New ad set"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={uploading}>
            {uploading ? "Uploading…" : initialData ? "Save changes" : "Create ad set"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Q4 retargeting — Le New Black"
          required
        />
        <Select label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {AD_PLATFORM_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </Select>
        <Textarea
          label="Notes (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Campaign goal, audience, when it ran…"
          rows={2}
        />

        {/* Visuals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Visuals <span className="text-gray-400 font-normal">· the first one is the cover; order = carousel order</span>
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              addFiles(Array.from(e.dataTransfer.files))
            }}
            onClick={() => fileInput.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
            )}
          >
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-700">
              <span className="font-medium text-primary">Choose files</span> or drop them here
            </p>
            <p className="text-xs text-gray-500 mt-1">Images, videos or PDFs — several at once, or one .zip</p>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={AD_MEDIA_ACCEPT}
              className="hidden"
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []))
                e.target.value = ""
              }}
            />
          </div>

          {media.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
              {media.map((m, i) => (
                <div key={m.key} className="relative group rounded-md overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                  {m.fileType.startsWith("image/") && m.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.previewUrl} alt={m.fileName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2">
                      {m.fileType.startsWith("video/") ? <Film className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                      <span className="text-[10px] mt-1 text-center line-clamp-2 break-all">{m.fileName}</span>
                    </div>
                  )}
                  {i === 0 && (
                    <span className="absolute top-1 left-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/70 text-white">
                      Cover
                    </span>
                  )}
                  {m.status === "uploading" && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs text-gray-600">
                      Uploading…
                    </div>
                  )}
                  {m.status === "error" && (
                    <div className="absolute inset-0 bg-red-50/90 flex items-center justify-center text-[10px] text-red-700 p-1 text-center">
                      {m.error}
                    </div>
                  )}
                  <div className="absolute bottom-1 inset-x-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="flex gap-1">
                      <button type="button" onClick={() => moveMedia(i, -1)} disabled={i === 0} className="p-1 rounded bg-white/90 shadow disabled:opacity-40" aria-label="Move earlier">
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => moveMedia(i, 1)} disabled={i === media.length - 1} className="p-1 rounded bg-white/90 shadow disabled:opacity-40" aria-label="Move later">
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </span>
                    <button type="button" onClick={() => setMedia((prev) => prev.filter((x) => x.key !== m.key))} className="p-1 rounded bg-white/90 shadow text-red-600" aria-label="Remove">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Copy versions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Copy versions</label>
          <div className="space-y-3">
            {copies.map((c, i) => (
              <div key={c.key} className="rounded-lg border border-gray-200 p-3 space-y-3 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <Input
                    value={c.label}
                    onChange={(e) => updateCopy(c.key, { label: e.target.value })}
                    placeholder={`Version ${String.fromCharCode(65 + i)}`}
                    aria-label="Label"
                  />
                  <select
                    value={c.language}
                    onChange={(e) => updateCopy(c.key, { language: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                    aria-label="Language"
                  >
                    <option value="">Any language</option>
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  {copies.length > 1 && (
                    <button type="button" onClick={() => setCopies((prev) => prev.filter((x) => x.key !== c.key))} className="p-2 text-gray-400 hover:text-red-600" aria-label="Remove copy version">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div>
                  <Textarea
                    label="Intro text"
                    value={c.introText}
                    onChange={(e) => updateCopy(c.key, { introText: e.target.value })}
                    rows={4}
                    placeholder="The text above the visual…"
                  />
                  <p className={cn("text-xs mt-1", platform === "LINKEDIN" && c.introText.length > 150 ? "text-amber-700" : "text-gray-400")}>
                    {c.introText.length} characters
                    {platform === "LINKEDIN" && c.introText.length > 150 && " — LinkedIn cuts off after ~150 with “…see more”"}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Headline"
                    value={c.headline}
                    onChange={(e) => updateCopy(c.key, { headline: e.target.value })}
                    helperText={`${c.headline.length}/70 recommended`}
                  />
                  <Select label="Call to action" value={c.ctaLabel} onChange={(e) => updateCopy(c.key, { ctaLabel: e.target.value })}>
                    <option value="">None</option>
                    {CTA_OPTIONS.map((cta) => (
                      <option key={cta} value={cta}>{cta}</option>
                    ))}
                  </Select>
                </div>
                <Input
                  label="Destination link"
                  value={c.destinationUrl}
                  onChange={(e) => updateCopy(c.key, { destinationUrl: e.target.value })}
                  placeholder="https://…"
                />
              </div>
            ))}
          </div>
          {copies.length < 10 && (
            <button type="button" onClick={() => setCopies((prev) => [...prev, emptyCopy()])} className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Plus className="w-4 h-4" /> Add copy version
            </button>
          )}
        </div>

        {/* Audience */}
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Who can see this?</label>
          <div className="flex gap-2">
            {([
              { value: "EMPLOYEES", icon: Lock, label: "Employees only", hint: "Colect and Le New Black staff" },
              { value: "EVERYONE", icon: Users, label: "Everyone", hint: "Partners too" },
            ] as const).map(({ value, icon: Icon, label, hint }) => (
              <button
                key={value}
                type="button"
                onClick={() => setVisibility(value)}
                className={cn(
                  "flex-1 flex items-start gap-2 px-4 py-3 rounded-lg border-2 transition-colors text-left",
                  visibility === value ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Icon className={cn("w-4 h-4 mt-0.5", visibility === value ? "text-primary" : "text-gray-400")} />
                <span>
                  <span className={cn("block text-sm font-medium", visibility === value ? "text-primary" : "text-gray-700")}>{label}</span>
                  <span className="block text-xs text-gray-500">{hint}</span>
                </span>
              </button>
            ))}
          </div>
          <Select
            label="For Colect or Le New Black? (optional)"
            value={brand}
            onChange={(e) => setBrand(e.target.value as ContentBrand | "")}
            helperText="Internal tag. Only Colect and Le New Black staff see it."
          >
            <option value="">Not set</option>
            <option value="COLECT">Colect</option>
            <option value="LE_NEW_BLACK">Le New Black</option>
            <option value="BOTH">Both</option>
          </Select>
          <Checkbox
            label="Publish"
            description="Show it on the Ads page now (otherwise it's saved as a draft)"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
          />
        </div>

        {notice && <p className="text-sm text-amber-800 bg-amber-50 rounded-md px-3 py-2">{notice}</p>}
      </div>
    </Modal>
  )
}
