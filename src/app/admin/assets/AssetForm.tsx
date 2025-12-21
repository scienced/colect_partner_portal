"use client"

import { useState } from "react"
import { Asset, AssetType } from "@prisma/client"
import { Button } from "@/components/ui/Button"
import { Input, Textarea, Select, Checkbox } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { FileUploader } from "@/components/admin/FileUploader"

interface AssetFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Partial<Asset>) => Promise<void>
  initialData?: Asset
}

const LANGUAGES = ["EN", "DE", "FR"]
const PERSONAS = ["Sales", "Marketing", "Technical", "Executive"]

export function AssetForm({
  open,
  onClose,
  onSubmit,
  initialData,
}: AssetFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: initialData?.type || ("DECK" as AssetType),
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
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({
        ...formData,
        publishedAt: formData.publishedAt ? new Date(formData.publishedAt) : null,
      })
    } finally {
      setLoading(false)
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

        {/* File upload - different for videos */}
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

        {/* Asset-specific fields */}
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

        {/* Video-specific fields */}
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
