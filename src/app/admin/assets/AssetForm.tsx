"use client"

import { useState, useEffect } from "react"
import { Asset, AssetType } from "@prisma/client"
import { Button } from "@/components/ui/Button"
import { Input, Textarea, Select, Checkbox } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { FileUploader } from "@/components/admin/FileUploader"
import { Wand2 } from "lucide-react"

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
      })
      setThumbnailError(null)
    }
  }, [open, initialData, defaultType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({
        ...formData,
        publishedAt: formData.publishedAt ? new Date(formData.publishedAt) : null,
        sentAt: formData.sentAt ? new Date(formData.sentAt) : null,
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
            label="Campaign Email (HTML from SingleFile)"
            folder="campaigns"
            currentUrl={formData.fileUrl}
            onUploadComplete={(url) =>
              setFormData({ ...formData, fileUrl: url })
            }
            accept=".html,.htm"
            maxSizeMB={20}
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => generateThumbnail(formData.fileUrl)}
                disabled={generatingThumbnail || !formData.fileUrl}
              >
                <Wand2 className="w-4 h-4 mr-1" />
                {generatingThumbnail ? "Generating..." : "Auto-generate from email"}
              </Button>
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
              label="Campaign Link"
              value={formData.campaignLink}
              onChange={(e) =>
                setFormData({ ...formData, campaignLink: e.target.value })
              }
              placeholder="https://..."
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
      </form>
    </Modal>
  )
}
