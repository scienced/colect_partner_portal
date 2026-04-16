"use client"

import { useState, useEffect, useMemo } from "react"
import type { Asset, AssetVariant, AssetType } from "@prisma/client"
import { Button } from "@/components/ui/Button"
import { Input, Textarea, Select, Checkbox } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { FileUploader } from "@/components/admin/FileUploader"
import { Wand2, Pin, Link2, Upload, Plus, X, Globe } from "lucide-react"
import { endOfWeek, endOfMonth, addDays, format } from "date-fns"
import {
  canonicalLanguage,
  stripPresignQuery,
  SUPPORTED_LANGUAGES,
} from "@/lib/assetVariants"

type PinDuration = "14days" | "endOfWeek" | "endOfMonth" | "custom"

const PERSONAS = ["Sales", "Marketing", "Technical", "Executive"]

type ShareMode = "link" | "file" | "both"

interface VariantFormData {
  language: string
  fileUrl: string
  externalLink: string
  shareMode: ShareMode
}

function deriveShareMode(fileUrl: string, externalLink: string): ShareMode {
  if (fileUrl && externalLink) return "both"
  if (fileUrl) return "file"
  return "link"
}

function calculatePinExpiresAt(duration: PinDuration, customDate: string | null): Date | null {
  const now = new Date()
  switch (duration) {
    case "14days":
      return addDays(now, 14)
    case "endOfWeek":
      return endOfWeek(now, { weekStartsOn: 1 })
    case "endOfMonth":
      return endOfMonth(now)
    case "custom":
      return customDate ? new Date(customDate) : null
    default:
      return null
  }
}

type AssetWithVariants = Asset & { variants?: AssetVariant[] }

interface AssetFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  initialData?: AssetWithVariants
  defaultType?: AssetType
}

export function AssetForm({
  open,
  onClose,
  onSubmit,
  initialData,
  defaultType = "DECK",
}: AssetFormProps) {
  const [loading, setLoading] = useState(false)
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false)
  const [thumbnailError, setThumbnailError] = useState<string | null>(null)
  const [pinDuration, setPinDuration] = useState<PinDuration>("14days")
  const [customPinDate, setCustomPinDate] = useState<string>("")
  const [activeLanguage, setActiveLanguage] = useState<string>("EN")
  const [showAddLanguage, setShowAddLanguage] = useState(false)

  const [formData, setFormData] = useState({
    type: initialData?.type || defaultType,
    title: initialData?.title || "",
    description: initialData?.description || "",
    thumbnailUrl: initialData?.thumbnailUrl || "",
    blurDataUrl: initialData?.blurDataUrl || "",
    persona: initialData?.persona || [],
    campaignGoal: initialData?.campaignGoal || "",
    campaignLink: initialData?.campaignLink || "",
    publishedAt: initialData?.publishedAt
      ? new Date(initialData.publishedAt).toISOString()
      : null as string | null,
    sentAt: initialData?.sentAt
      ? new Date(initialData.sentAt).toISOString().slice(0, 16)
      : "",
    isPinned: initialData?.isPinned || false,
    pinExpiresAt: initialData?.pinExpiresAt
      ? new Date(initialData.pinExpiresAt).toISOString().slice(0, 16)
      : "",
    variants: initialVariants(initialData),
  })

  function initialVariants(data?: AssetWithVariants): VariantFormData[] {
    if (data?.variants && data.variants.length > 0) {
      return data.variants
        .slice()
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.language.localeCompare(b.language))
        .map((v) => ({
          language: v.language,
          fileUrl: v.fileUrl || "",
          externalLink: v.externalLink || "",
          shareMode: deriveShareMode(v.fileUrl || "", v.externalLink || ""),
        }))
    }
    // New asset → start with one empty EN variant
    return [{ language: "EN", fileUrl: "", externalLink: "", shareMode: "link" }]
  }

  // Reset form state when modal opens or initialData changes
  useEffect(() => {
    if (open) {
      const freshVariants = initialVariants(initialData)
      setFormData({
        type: initialData?.type || defaultType,
        title: initialData?.title || "",
        description: initialData?.description || "",
        thumbnailUrl: initialData?.thumbnailUrl || "",
        blurDataUrl: initialData?.blurDataUrl || "",
        persona: initialData?.persona || [],
        campaignGoal: initialData?.campaignGoal || "",
        campaignLink: initialData?.campaignLink || "",
        publishedAt: initialData?.publishedAt
          ? new Date(initialData.publishedAt).toISOString()
          : null,
        sentAt: initialData?.sentAt
          ? new Date(initialData.sentAt).toISOString().slice(0, 16)
          : "",
        isPinned: initialData?.isPinned || false,
        pinExpiresAt: initialData?.pinExpiresAt
          ? new Date(initialData.pinExpiresAt).toISOString().slice(0, 16)
          : "",
        variants: freshVariants,
      })
      setActiveLanguage(freshVariants[0]?.language || "EN")
      setShowAddLanguage(false)
      setThumbnailError(null)
      setPinDuration("14days")
      setCustomPinDate("")
    }
  }, [open, initialData, defaultType])

  const activeVariant = formData.variants.find((v) => v.language === activeLanguage)
  const activeIndex = formData.variants.findIndex((v) => v.language === activeLanguage)

  const unusedLanguages = SUPPORTED_LANGUAGES.filter(
    (l) => !formData.variants.some((v) => v.language === l)
  )

  // Calculate pin expiration date preview
  const pinExpiresAtPreview = useMemo(() => {
    if (!formData.isPinned) return null
    if (pinDuration === "custom" && customPinDate) {
      return new Date(customPinDate)
    }
    return calculatePinExpiresAt(pinDuration, customPinDate)
  }, [formData.isPinned, pinDuration, customPinDate])

  function updateActiveVariant(patch: Partial<VariantFormData>) {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === activeIndex ? { ...v, ...patch } : v
      ),
    }))
  }

  function setActiveShareMode(mode: ShareMode) {
    if (!activeVariant) return
    // Switch the display mode only — don't destroy data. The user may be
    // peeking at the other tab. The save logic uses shareMode to decide
    // which field(s) to persist.
    updateActiveVariant({ shareMode: mode })
  }

  function addLanguage(lang: string) {
    const canonical = canonicalLanguage(lang)
    if (formData.variants.some((v) => v.language === canonical)) return
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { language: canonical, fileUrl: "", externalLink: "", shareMode: "link" },
      ],
    }))
    setActiveLanguage(canonical)
    setShowAddLanguage(false)
  }

  function removeLanguage(lang: string) {
    if (formData.variants.length <= 1) {
      alert("An asset must have at least one language version.")
      return
    }
    const confirmed = window.confirm(
      `Remove the ${lang} version? This can't be undone after saving.`
    )
    if (!confirmed) return
    setFormData((prev) => {
      const remaining = prev.variants.filter((v) => v.language !== lang)
      return { ...prev, variants: remaining }
    })
    // Shift active tab to the first remaining variant
    const remaining = formData.variants.filter((v) => v.language !== lang)
    if (remaining.length > 0 && activeLanguage === lang) {
      setActiveLanguage(remaining[0].language)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation: at least one variant with content in its active share mode.
    // "Active mode" means: if the variant shareMode is "link", only the
    // externalLink field counts; if "file", only the fileUrl; if "both", either.
    const variantsWithContent = formData.variants.filter((v) => {
      if (v.shareMode === "link") return v.externalLink.trim() !== ""
      if (v.shareMode === "file") return v.fileUrl.trim() !== ""
      return v.fileUrl.trim() !== "" || v.externalLink.trim() !== ""
    })
    if (variantsWithContent.length === 0) {
      alert(
        "Add at least one language version with a file or external link before saving."
      )
      return
    }

    setLoading(true)
    try {
      let pinExpiresAt: Date | null = null
      if (formData.isPinned) {
        if (pinDuration === "custom" && customPinDate) {
          pinExpiresAt = new Date(customPinDate)
        } else {
          pinExpiresAt = calculatePinExpiresAt(pinDuration, customPinDate)
        }
      }

      await onSubmit({
        type: formData.type,
        title: formData.title,
        description: formData.description,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        blurDataUrl: formData.blurDataUrl || undefined,
        persona: formData.persona,
        campaignGoal: formData.campaignGoal || undefined,
        campaignLink: formData.campaignLink || undefined,
        publishedAt: formData.publishedAt,
        sentAt: formData.sentAt ? new Date(formData.sentAt).toISOString() : null,
        isPinned: formData.isPinned,
        pinExpiresAt: pinExpiresAt ? pinExpiresAt.toISOString() : null,
        variants: variantsWithContent.map((v, idx) => ({
          language: v.language,
          // shareMode decides which field(s) to persist. This matches the
          // user's visible intent: if they've selected "link", only the link
          // is saved even if a file is still in form state from an earlier edit.
          // Also strip presigned query string so the DB stores the raw S3 URL.
          fileUrl:
            v.shareMode === "link" ? null : stripPresignQuery(v.fileUrl) || null,
          externalLink:
            v.shareMode === "file" ? null : v.externalLink || null,
          displayOrder: idx,
        })),
      })
    } finally {
      setLoading(false)
    }
  }

  const generateThumbnail = async (url: string) => {
    if (!url) return
    setGeneratingThumbnail(true)
    setThumbnailError(null)
    try {
      const response = await fetch("/api/upload/campaign-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlUrl: url }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || error.error || "Failed to generate thumbnail")
      }
      const { thumbnailUrl } = await response.json()
      setFormData((prev) => ({ ...prev, thumbnailUrl }))
    } catch (error) {
      console.error("Thumbnail generation failed:", error)
      setThumbnailError(error instanceof Error ? error.message : "Failed to generate thumbnail")
    } finally {
      setGeneratingThumbnail(false)
    }
  }

  const togglePersona = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      persona: prev.persona.includes(value)
        ? prev.persona.filter((v: string) => v !== value)
        : [...prev.persona, value],
    }))
  }

  // Type-specific placeholders and help text for the variant content fields
  const linkPlaceholder = (() => {
    switch (formData.type) {
      case "VIDEO":
        return "https://youtube.com/watch?v=... or https://youtu.be/..."
      case "DECK":
        return "https://docs.google.com/presentation/..."
      case "CAMPAIGN":
        return "https://figma.com/... or https://docs.google.com/..."
      default:
        return "https://docs.google.com/..., https://figma.com/..."
    }
  })()

  const fileAccept = (() => {
    switch (formData.type) {
      case "VIDEO":
        return ".mp4,.mov,.webm,.avi"
      case "CAMPAIGN":
        return ".html,.htm,.pdf,.pptx,.ppt,.doc,.docx,.xls,.xlsx,.zip,.png,.jpg,.jpeg"
      default:
        return ".pdf,.pptx,.ppt,.doc,.docx,.xls,.xlsx,.zip,.png,.jpg,.jpeg"
    }
  })()

  const fileMaxMB = formData.type === "VIDEO" ? 500 : 50
  const fileFolder =
    formData.type === "VIDEO"
      ? "videos"
      : formData.type === "CAMPAIGN"
      ? "campaigns"
      : "assets"

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Edit Asset" : "Add New Asset"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            {initialData ? "Save Changes" : "Create Asset"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Select
          label="Type"
          value={formData.type}
          onChange={(e) =>
            setFormData({ ...formData, type: e.target.value as AssetType })
          }
        >
          <option value="DECK">Sales Deck</option>
          <option value="CAMPAIGN">Campaign</option>
          <option value="ASSET">Asset</option>
          <option value="VIDEO">Video</option>
        </Select>

        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
        />

        {/* Language tabs — one variant per tab */}
        <div className="border border-gray-200 rounded-lg">
          <div className="flex items-center gap-1 px-3 pt-3 pb-0 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <Globe className="w-4 h-4 text-gray-400 mr-1" />
            <span className="text-xs font-medium text-gray-500 mr-2 uppercase tracking-wide">
              Languages
            </span>
            {/* Scrolling tabs container (clips horizontally only) */}
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
              {formData.variants.map((v) => {
                const isActive = v.language === activeLanguage
                return (
                  <button
                    key={v.language}
                    type="button"
                    onClick={() => setActiveLanguage(v.language)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-t-md text-sm font-medium transition-colors flex-shrink-0 ${
                      isActive
                        ? "bg-white text-primary border border-gray-200 border-b-white -mb-px"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {v.language}
                    {isActive && formData.variants.length > 1 && (
                      <span
                        role="button"
                        aria-label={`Remove ${v.language}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          removeLanguage(v.language)
                        }}
                        className="ml-1 -mr-1 p-0.5 rounded hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {/* Add Language — OUTSIDE the scrolling container so the dropdown
                doesn't get clipped by overflow-x-auto. */}
            {unusedLanguages.length > 0 && (
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddLanguage((s) => !s)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add language
                </button>
                {showAddLanguage && (
                  <>
                    {/* Click-outside overlay to dismiss */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowAddLanguage(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                      {unusedLanguages.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => addLanguage(lang)}
                          className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Active tab body */}
          {activeVariant && (
            <div className="p-4 space-y-3 bg-white">
              <label className="block text-sm font-medium text-gray-700">
                How should partners access the {activeVariant.language} version?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveShareMode("link")}
                  className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors text-sm font-medium ${
                    activeVariant.shareMode === "link" || activeVariant.shareMode === "both"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <Link2 className="w-4 h-4" />
                  External link
                </button>
                <button
                  type="button"
                  onClick={() => setActiveShareMode("file")}
                  className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors text-sm font-medium ${
                    activeVariant.shareMode === "file" || activeVariant.shareMode === "both"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload file
                </button>
              </div>

              {(activeVariant.shareMode === "link" || activeVariant.shareMode === "both") && (
                <Input
                  label="External Link"
                  value={activeVariant.externalLink}
                  onChange={(e) => updateActiveVariant({ externalLink: e.target.value })}
                  placeholder={linkPlaceholder}
                  helperText="Google Doc, YouTube video, Figma file, website, or any online resource"
                />
              )}

              {(activeVariant.shareMode === "file" || activeVariant.shareMode === "both") && (
                <FileUploader
                  label="File"
                  folder={fileFolder}
                  currentUrl={activeVariant.fileUrl}
                  onUploadComplete={(url) => updateActiveVariant({ fileUrl: url })}
                  accept={fileAccept}
                  maxSizeMB={fileMaxMB}
                />
              )}

              {activeVariant.shareMode !== "both" && (
                <button
                  type="button"
                  onClick={() => setActiveShareMode("both")}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {activeVariant.shareMode === "link"
                    ? "Also upload a file"
                    : "Also add an external link"}
                </button>
              )}

              {activeVariant.shareMode === "both" && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2">
                  Partners will see both a download button and an external link for {activeVariant.language}.
                  Useful for presentations where you offer a PDF download and a link to editable slides.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Thumbnail upload with auto-generate option for campaigns and assets */}
        <div className="space-y-2">
          <FileUploader
            label="Thumbnail"
            folder="thumbnails"
            currentUrl={formData.thumbnailUrl}
            onUploadComplete={(url, metadata) =>
              setFormData({ ...formData, thumbnailUrl: url, blurDataUrl: metadata?.blurDataUrl || "" })
            }
            accept="image/*"
            maxSizeMB={5}
          />
          {formData.type === "CAMPAIGN" && activeVariant && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeVariant.fileUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => generateThumbnail(activeVariant.fileUrl)}
                  disabled={generatingThumbnail}
                >
                  <Wand2 className="w-4 h-4 mr-1" />
                  {generatingThumbnail ? "Generating..." : "From file"}
                </Button>
              )}
              {activeVariant.externalLink && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => generateThumbnail(activeVariant.externalLink)}
                  disabled={generatingThumbnail}
                >
                  <Wand2 className="w-4 h-4 mr-1" />
                  {generatingThumbnail ? "Generating..." : "From design link"}
                </Button>
              )}
              {thumbnailError && (
                <span className="text-sm text-red-500">{thumbnailError}</span>
              )}
            </div>
          )}
          {formData.type === "ASSET" && activeVariant && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => generateThumbnail(activeVariant.externalLink)}
                disabled={generatingThumbnail || !activeVariant.externalLink}
              >
                <Wand2 className="w-4 h-4 mr-1" />
                {generatingThumbnail ? "Generating..." : "Auto-generate from link"}
              </Button>
              {thumbnailError && (
                <span className="text-sm text-red-500">{thumbnailError}</span>
              )}
            </div>
          )}
        </div>

        {/* Personas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Personas
          </label>
          <div className="flex flex-wrap gap-2">
            {PERSONAS.map((persona) => (
              <label
                key={persona}
                className={`px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                  formData.persona.includes(persona)
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.persona.includes(persona)}
                  onChange={() => togglePersona(persona)}
                  className="sr-only"
                />
                {persona}
              </label>
            ))}
          </div>
        </div>

        {/* Campaign-specific fields */}
        {formData.type === "CAMPAIGN" && (
          <>
            <Input
              label="Sent Date"
              type="datetime-local"
              value={formData.sentAt}
              onChange={(e) =>
                setFormData({ ...formData, sentAt: e.target.value })
              }
              helperText="When the campaign email was or will be sent"
            />
            <Input
              label="Campaign Goal"
              value={formData.campaignGoal}
              onChange={(e) =>
                setFormData({ ...formData, campaignGoal: e.target.value })
              }
              placeholder="e.g., Increase partner engagement"
            />
            <Input
              label="Campaign Platform Link (optional)"
              value={formData.campaignLink}
              onChange={(e) =>
                setFormData({ ...formData, campaignLink: e.target.value })
              }
              placeholder="https://app.hubspot.com/... or https://mailchimp.com/..."
              helperText="Link to campaign in HubSpot, Mailchimp, etc."
            />
          </>
        )}

        {/* Publish */}
        <Checkbox
          label="Publish immediately"
          description="Make this asset visible to partners"
          checked={!!formData.publishedAt}
          onChange={(e) =>
            setFormData({
              ...formData,
              publishedAt: e.target.checked ? new Date().toISOString() : null,
            })
          }
        />

        {/* Pin to top */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Pin className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-gray-700">Pin to Top</span>
          </div>
          <Checkbox
            label="Pin to top of category"
            description="Display this asset at the top of its category page"
            checked={formData.isPinned}
            onChange={(e) =>
              setFormData({ ...formData, isPinned: e.target.checked })
            }
          />

          {formData.isPinned && (
            <div className="mt-4 space-y-3 pl-6 border-l-2 border-amber-200">
              <Select
                label="Pin Duration"
                value={pinDuration}
                onChange={(e) => setPinDuration(e.target.value as PinDuration)}
              >
                <option value="14days">14 days</option>
                <option value="endOfWeek">End of week</option>
                <option value="endOfMonth">End of month</option>
                <option value="custom">Custom date</option>
              </Select>

              {pinDuration === "custom" && (
                <Input
                  label="Custom Expiration Date"
                  type="datetime-local"
                  value={customPinDate}
                  onChange={(e) => setCustomPinDate(e.target.value)}
                />
              )}

              {pinExpiresAtPreview && (
                <div className="bg-amber-50 rounded-md p-3">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">Will unpin:</span>{" "}
                    {format(pinExpiresAtPreview, "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
