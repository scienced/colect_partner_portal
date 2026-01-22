"use client"

import { useState, useEffect, useMemo } from "react"
import { Asset, AssetType } from "@prisma/client"
import { Button } from "@/components/ui/Button"
import { Input, Textarea, Select, Checkbox } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { FileUploader } from "@/components/admin/FileUploader"
import { Wand2, Pin } from "lucide-react"
import { endOfWeek, endOfMonth, addDays, format } from "date-fns"

type PinDuration = "14days" | "endOfWeek" | "endOfMonth" | "custom"

function calculatePinExpiresAt(duration: PinDuration, customDate: string | null): Date | null {
  const now = new Date()
  switch (duration) {
    case "14days":
      return addDays(now, 14)
    case "endOfWeek":
      return endOfWeek(now, { weekStartsOn: 1 }) // Monday as start of week
    case "endOfMonth":
      return endOfMonth(now)
    case "custom":
      return customDate ? new Date(customDate) : null
    default:
      return null
  }
}

interface AssetFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Partial<Asset>) => Promise<void>
  initialData?: Asset
  defaultType?: AssetType
}

const LANGUAGES = ["EN", "DE", "FR"]
const PERSONAS = ["Sales", "Marketing", "Technical", "Executive"]

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
  const [formData, setFormData] = useState({
    type: initialData?.type || defaultType,
    title: initialData?.title || "",
    description: initialData?.description || "",
    fileUrl: initialData?.fileUrl || "",
    thumbnailUrl: initialData?.thumbnailUrl || "",
    language: initialData?.language || [],
    persona: initialData?.persona || [],
    campaignGoal: initialData?.campaignGoal || "",
    campaignLink: initialData?.campaignLink || "",
    externalLink: initialData?.externalLink || "",
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
  })

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (open) {
      setFormData({
        type: initialData?.type || defaultType,
        title: initialData?.title || "",
        description: initialData?.description || "",
        fileUrl: initialData?.fileUrl || "",
        thumbnailUrl: initialData?.thumbnailUrl || "",
        language: initialData?.language || [],
        persona: initialData?.persona || [],
        campaignGoal: initialData?.campaignGoal || "",
        campaignLink: initialData?.campaignLink || "",
        externalLink: initialData?.externalLink || "",
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
      })
      setThumbnailError(null)
      setPinDuration("14days")
      setCustomPinDate("")
    }
  }, [open, initialData, defaultType])

  // Calculate pin expiration date preview
  const pinExpiresAtPreview = useMemo(() => {
    if (!formData.isPinned) return null
    if (pinDuration === "custom" && customPinDate) {
      return new Date(customPinDate)
    }
    return calculatePinExpiresAt(pinDuration, customPinDate)
  }, [formData.isPinned, pinDuration, customPinDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Calculate pin expiration date
      let pinExpiresAt: Date | null = null
      if (formData.isPinned) {
        if (pinDuration === "custom" && customPinDate) {
          pinExpiresAt = new Date(customPinDate)
        } else {
          pinExpiresAt = calculatePinExpiresAt(pinDuration, customPinDate)
        }
      }

      await onSubmit({
        ...formData,
        publishedAt: formData.publishedAt ? new Date(formData.publishedAt) : null,
        sentAt: formData.sentAt ? new Date(formData.sentAt) : null,
        isPinned: formData.isPinned,
        pinnedAt: formData.isPinned ? new Date() : null,
        pinExpiresAt,
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
      setFormData(prev => ({ ...prev, thumbnailUrl }))
    } catch (error) {
      console.error("Thumbnail generation failed:", error)
      setThumbnailError(error instanceof Error ? error.message : "Failed to generate thumbnail")
    } finally {
      setGeneratingThumbnail(false)
    }
  }

  const toggleArrayValue = (
    field: "language" | "persona",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }))
  }

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

        {/* Asset-specific: External Link (before file upload so thumbnail can use it) */}
        {formData.type === "ASSET" && (
          <Input
            label="External Link"
            value={formData.externalLink}
            onChange={(e) =>
              setFormData({ ...formData, externalLink: e.target.value })
            }
            placeholder="https://figma.com/..."
            helperText="Figma, demo environment, or other external link"
          />
        )}

        {/* Deck-specific: External Link for Google Slides */}
        {formData.type === "DECK" && (
          <Input
            label="Live Document Link (optional)"
            value={formData.externalLink}
            onChange={(e) =>
              setFormData({ ...formData, externalLink: e.target.value })
            }
            placeholder="https://docs.google.com/presentation/..."
            helperText="Google Slides or other live document URL"
          />
        )}

        {/* Video-specific: YouTube URL (before file upload) */}
        {formData.type === "VIDEO" && (
          <Input
            label="YouTube / Video URL"
            value={formData.externalLink}
            onChange={(e) =>
              setFormData({ ...formData, externalLink: e.target.value })
            }
            placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
            helperText="YouTube, Vimeo, or other video URL (if not uploading a file)"
          />
        )}

        {/* Campaign-specific: External Link for design files */}
        {formData.type === "CAMPAIGN" && (
          <Input
            label="Design Link (optional)"
            value={formData.externalLink}
            onChange={(e) =>
              setFormData({ ...formData, externalLink: e.target.value })
            }
            placeholder="https://figma.com/... or https://docs.google.com/..."
            helperText="Link to Figma designs, Google Slides ads, or other design files"
          />
        )}

        {/* File upload - different for videos and campaigns */}
        {formData.type === "VIDEO" ? (
          <FileUploader
            label="Video File (optional if using YouTube)"
            folder="videos"
            currentUrl={formData.fileUrl}
            onUploadComplete={(url) =>
              setFormData({ ...formData, fileUrl: url })
            }
            accept=".mp4,.mov,.webm,.avi"
            maxSizeMB={500}
          />
        ) : formData.type === "CAMPAIGN" ? (
          <FileUploader
            label="Campaign File — HTML email, PDF, presentation, or image (optional)"
            folder="campaigns"
            currentUrl={formData.fileUrl}
            onUploadComplete={(url) =>
              setFormData({ ...formData, fileUrl: url })
            }
            accept=".html,.htm,.pdf,.pptx,.ppt,.doc,.docx,.xls,.xlsx,.zip,.png,.jpg,.jpeg"
            maxSizeMB={50}
          />
        ) : formData.type === "ASSET" ? (
          <FileUploader
            label="File (optional)"
            folder="assets"
            currentUrl={formData.fileUrl}
            onUploadComplete={(url) =>
              setFormData({ ...formData, fileUrl: url })
            }
            accept=".pdf,.pptx,.ppt,.doc,.docx,.xls,.xlsx,.zip"
            maxSizeMB={50}
          />
        ) : (
          <FileUploader
            label="File"
            folder="assets"
            currentUrl={formData.fileUrl}
            onUploadComplete={(url) =>
              setFormData({ ...formData, fileUrl: url })
            }
            accept=".pdf,.pptx,.ppt,.doc,.docx,.xls,.xlsx,.zip"
            maxSizeMB={50}
          />
        )}

        {/* Thumbnail upload with auto-generate option for campaigns and assets */}
        <div className="space-y-2">
          <FileUploader
            label="Thumbnail"
            folder="thumbnails"
            currentUrl={formData.thumbnailUrl}
            onUploadComplete={(url) =>
              setFormData({ ...formData, thumbnailUrl: url })
            }
            accept="image/*"
            maxSizeMB={5}
          />
          {formData.type === "CAMPAIGN" && (
            <div className="flex items-center gap-2 flex-wrap">
              {formData.fileUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => generateThumbnail(formData.fileUrl)}
                  disabled={generatingThumbnail}
                >
                  <Wand2 className="w-4 h-4 mr-1" />
                  {generatingThumbnail ? "Generating..." : "From file"}
                </Button>
              )}
              {formData.externalLink && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => generateThumbnail(formData.externalLink)}
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
          {formData.type === "ASSET" && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => generateThumbnail(formData.externalLink)}
                disabled={generatingThumbnail || !formData.externalLink}
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

        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Languages
          </label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <label
                key={lang}
                className={`px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                  formData.language.includes(lang)
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.language.includes(lang)}
                  onChange={() => toggleArrayValue("language", lang)}
                  className="sr-only"
                />
                {lang}
              </label>
            ))}
          </div>
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
                  onChange={() => toggleArrayValue("persona", persona)}
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
              setFormData({
                ...formData,
                isPinned: e.target.checked,
              })
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
