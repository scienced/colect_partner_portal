"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Asset, AssetType } from "@prisma/client"
import { Card } from "@/components/ui/Card"
import { Button, IconButton } from "@/components/ui/Button"
import { Input, Textarea, Checkbox } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { AssetForm } from "./assets/AssetForm"
import {
  FileText,
  BookOpen,
  Plus,
  ArrowRight,
  Edit,
  Play,
  Mail,
  ExternalLink,
} from "lucide-react"

interface AdminDashboardClientProps {
  recentAssets: Asset[]
}

const assetTypeIcons: Record<string, React.ReactNode> = {
  DECK: <FileText className="w-4 h-4 text-blue-500" />,
  VIDEO: <Play className="w-4 h-4 text-red-500" />,
  CAMPAIGN: <Mail className="w-4 h-4 text-purple-500" />,
  ASSET: <ExternalLink className="w-4 h-4 text-teal-500" />,
}

export function AdminDashboardClient({ recentAssets }: AdminDashboardClientProps) {
  const router = useRouter()

  // Asset form state
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [assetFormType, setAssetFormType] = useState<AssetType>("DECK")
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)

  // Docs update form state
  const [showDocsForm, setShowDocsForm] = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsFormData, setDocsFormData] = useState({
    title: "",
    summary: "",
    deepLink: "",
    category: "",
    publishedAt: null as string | null,
  })

  // Featured content form state
  const [showFeaturedForm, setShowFeaturedForm] = useState(false)

  const openAssetForm = (type: AssetType) => {
    setAssetFormType(type)
    setEditingAsset(null)
    setShowAssetForm(true)
  }

  const openEditAssetForm = (asset: Asset) => {
    setEditingAsset(asset)
    setShowAssetForm(true)
  }

  const handleAssetSubmit = async (data: Partial<Asset>) => {
    const url = editingAsset ? `/api/assets/${editingAsset.id}` : "/api/assets"
    const method = editingAsset ? "PUT" : "POST"

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      setShowAssetForm(false)
      setEditingAsset(null)
      router.refresh()
    }
  }

  const handleDocsSubmit = async () => {
    setDocsLoading(true)
    try {
      const response = await fetch("/api/docs-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...docsFormData,
          publishedAt: docsFormData.publishedAt ? new Date(docsFormData.publishedAt) : null,
        }),
      })

      if (response.ok) {
        setShowDocsForm(false)
        setDocsFormData({
          title: "",
          summary: "",
          deepLink: "",
          category: "",
          publishedAt: null,
        })
        router.refresh()
      }
    } finally {
      setDocsLoading(false)
    }
  }

  return (
    <>
      {/* Quick Actions */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => openAssetForm("DECK")}
          >
            Add Sales Deck
          </Button>
          <Button
            variant="secondary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => openAssetForm("CAMPAIGN")}
          >
            Add Campaign
          </Button>
          <Button
            variant="secondary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => openAssetForm("VIDEO")}
          >
            Add Video
          </Button>
          <Button
            variant="secondary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => openAssetForm("ASSET")}
          >
            Add Asset/Link
          </Button>
          <Button
            variant="secondary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowDocsForm(true)}
          >
            Add Docs Update
          </Button>
          <Link href="/admin/featured">
            <Button
              variant="secondary"
              icon={<Plus className="w-4 h-4" />}
            >
              Feature Content
            </Button>
          </Link>
        </div>
      </Card>

      {/* Recent Assets */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Assets</h3>
          <Link href="/admin/assets">
            <Button
              variant="ghost"
              size="sm"
              iconAfter={<ArrowRight className="w-4 h-4" />}
            >
              View all
            </Button>
          </Link>
        </div>
        {recentAssets.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentAssets.map((asset) => (
              <div
                key={asset.id}
                className="py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                    {assetTypeIcons[asset.type] || <FileText className="w-4 h-4 text-gray-500" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{asset.title}</p>
                    <p className="text-sm text-gray-500">{asset.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </span>
                  <IconButton
                    icon={<Edit className="w-4 h-4" />}
                    variant="primary"
                    size="sm"
                    onClick={() => openEditAssetForm(asset)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No assets yet</p>
        )}
      </Card>

      {/* Asset Form Modal */}
      <AssetForm
        open={showAssetForm}
        onClose={() => {
          setShowAssetForm(false)
          setEditingAsset(null)
        }}
        onSubmit={handleAssetSubmit}
        initialData={editingAsset || undefined}
        defaultType={assetFormType}
      />

      {/* Docs Update Form Modal */}
      <Modal
        open={showDocsForm}
        onClose={() => {
          setShowDocsForm(false)
          setDocsFormData({
            title: "",
            summary: "",
            deepLink: "",
            category: "",
            publishedAt: null,
          })
        }}
        title="Add Documentation Update"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDocsForm(false)} disabled={docsLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDocsSubmit} loading={docsLoading}>
              Create Update
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={docsFormData.title}
            onChange={(e) => setDocsFormData({ ...docsFormData, title: e.target.value })}
            required
          />

          <Textarea
            label="Summary"
            value={docsFormData.summary}
            onChange={(e) => setDocsFormData({ ...docsFormData, summary: e.target.value })}
            rows={3}
            required
          />

          <Input
            label="Documentation Link"
            value={docsFormData.deepLink}
            onChange={(e) => setDocsFormData({ ...docsFormData, deepLink: e.target.value })}
            placeholder="https://docs.colect.io/..."
            required
          />

          <Input
            label="Category"
            value={docsFormData.category}
            onChange={(e) => setDocsFormData({ ...docsFormData, category: e.target.value })}
            placeholder="e.g., API, Integration, Getting Started"
          />

          <Checkbox
            label="Publish immediately"
            description="Make this update visible to partners"
            checked={!!docsFormData.publishedAt}
            onChange={(e) =>
              setDocsFormData({
                ...docsFormData,
                publishedAt: e.target.checked ? new Date().toISOString() : null,
              })
            }
          />
        </div>
      </Modal>
    </>
  )
}
