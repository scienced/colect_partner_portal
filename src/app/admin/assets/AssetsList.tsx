"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Asset, AssetType } from "@prisma/client"
import { Card } from "@/components/ui/Card"
import { Button, IconButton } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal, ConfirmModal } from "@/components/ui/Modal"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { AssetForm } from "./AssetForm"
import {
  Plus,
  Search,
  FileText,
  Mail,
  FolderOpen,
  Edit,
  Trash2,
  ExternalLink,
} from "lucide-react"

interface AssetsListProps {
  initialAssets: Asset[]
}

export function AssetsList({ initialAssets }: AssetsListProps) {
  const router = useRouter()
  const [assets, setAssets] = useState(initialAssets)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<AssetType | "">("")
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      !search ||
      asset.title.toLowerCase().includes(search.toLowerCase()) ||
      asset.description?.toLowerCase().includes(search.toLowerCase())
    const matchesType = !typeFilter || asset.type === typeFilter
    return matchesSearch && matchesType
  })

  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case "DECK":
        return <FileText className="w-5 h-5" />
      case "CAMPAIGN":
        return <Mail className="w-5 h-5" />
      case "ASSET":
        return <FolderOpen className="w-5 h-5" />
    }
  }

  const handleCreate = async (data: Partial<Asset>) => {
    const response = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      const newAsset = await response.json()
      setAssets([newAsset, ...assets])
      setShowForm(false)
      router.refresh()
    }
  }

  const handleUpdate = async (data: Partial<Asset>) => {
    if (!editingAsset) return

    const response = await fetch(`/api/assets/${editingAsset.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      const updatedAsset = await response.json()
      setAssets(
        assets.map((a) => (a.id === updatedAsset.id ? updatedAsset : a))
      )
      setEditingAsset(null)
      router.refresh()
    }
  }

  const handleDelete = async () => {
    if (!deletingAsset) return

    setIsDeleting(true)
    const response = await fetch(`/api/assets/${deletingAsset.id}`, {
      method: "DELETE",
    })

    if (response.ok) {
      setAssets(assets.filter((a) => a.id !== deletingAsset.id))
      setDeletingAsset(null)
      router.refresh()
    }
    setIsDeleting(false)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AssetType | "")}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All types</option>
            <option value="DECK">Decks</option>
            <option value="CAMPAIGN">Campaigns</option>
            <option value="ASSET">Assets</option>
          </select>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setShowForm(true)}
        >
          Add Asset
        </Button>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} padding="md">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-500">{getAssetIcon(asset.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-gray-900 truncate">
                        {asset.title}
                      </h3>
                      {asset.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {asset.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <IconButton
                        icon={<Edit className="w-4 h-4" />}
                        variant="primary"
                        size="sm"
                        onClick={() => setEditingAsset(asset)}
                      />
                      <IconButton
                        icon={<Trash2 className="w-4 h-4" />}
                        variant="danger"
                        size="sm"
                        onClick={() => setDeletingAsset(asset)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status="neutral">{asset.type}</StatusBadge>
                    {asset.publishedAt ? (
                      <StatusBadge status="success">Published</StatusBadge>
                    ) : (
                      <StatusBadge status="warning">Draft</StatusBadge>
                    )}
                    {asset.region.length > 0 && (
                      <span className="text-xs text-gray-400">
                        {asset.region.join(", ")}
                      </span>
                    )}
                  </div>
                  {(asset.fileUrl || asset.externalLink) && (
                    <div className="mt-2">
                      <a
                        href={asset.fileUrl || asset.externalLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View file
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <p className="text-gray-500">No assets found</p>
        </Card>
      )}

      {/* Create Form Modal */}
      <AssetForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreate}
      />

      {/* Edit Form Modal */}
      {editingAsset && (
        <AssetForm
          open={true}
          onClose={() => setEditingAsset(null)}
          onSubmit={handleUpdate}
          initialData={editingAsset}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deletingAsset}
        onClose={() => setDeletingAsset(null)}
        onConfirm={handleDelete}
        title="Delete Asset"
        message={`Are you sure you want to delete "${deletingAsset?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
}
