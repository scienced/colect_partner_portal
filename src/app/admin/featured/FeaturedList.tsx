"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FeaturedContent, Asset, DocsUpdate, ProductUpdate } from "@prisma/client"
import { Card } from "@/components/ui/Card"
import { Button, IconButton } from "@/components/ui/Button"
import { Input, Select } from "@/components/ui/Input"
import { Modal, ConfirmModal } from "@/components/ui/Modal"
import { StatusBadge } from "@/components/layout/SectionHeader"
import {
  Plus,
  Star,
  FileText,
  BookOpen,
  Package,
  Edit,
  Trash2,
  GripVertical,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type FeaturedContentWithRelations = FeaturedContent & {
  asset: Asset | null
  docsUpdate: DocsUpdate | null
  productUpdate: ProductUpdate | null
}

interface FeaturedListProps {
  initialFeatured: FeaturedContentWithRelations[]
  assets: Asset[]
  docsUpdates: DocsUpdate[]
  productUpdates: ProductUpdate[]
}

interface SortableItemProps {
  item: FeaturedContentWithRelations
  index: number
  getIcon: (entityType: string) => React.ReactNode
  onEdit: () => void
  onDelete: () => void
}

function SortableItem({ item, index, getIcon, onEdit, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  }

  const isActive =
    new Date(item.startDate) <= new Date() &&
    (!item.endDate || new Date(item.endDate) >= new Date())

  return (
    <div ref={setNodeRef} style={style}>
      <Card padding="md" className={isDragging ? "shadow-lg ring-2 ring-primary/20" : ""}>
        <div className="flex items-center gap-4">
          <div
            {...attributes}
            {...listeners}
            className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-5 h-5" />
          </div>
          <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600">
            {getIcon(item.entityType)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">#{index + 1}</span>
              <h3 className="font-medium text-gray-900">{item.title}</h3>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status="neutral">
              {item.entityType.replace("_", " ")}
            </StatusBadge>
            {isActive ? (
              <StatusBadge status="success">Active</StatusBadge>
            ) : (
              <StatusBadge status="warning">Scheduled</StatusBadge>
            )}
            <IconButton
              icon={<Edit className="w-4 h-4" />}
              variant="primary"
              size="sm"
              onClick={onEdit}
            />
            <IconButton
              icon={<Trash2 className="w-4 h-4" />}
              variant="danger"
              size="sm"
              onClick={onDelete}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

export function FeaturedList({
  initialFeatured,
  assets,
  docsUpdates,
  productUpdates,
}: FeaturedListProps) {
  const router = useRouter()
  const [featured, setFeatured] = useState(initialFeatured)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<FeaturedContentWithRelations | null>(null)
  const [deletingItem, setDeletingItem] = useState<FeaturedContentWithRelations | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = featured.findIndex((item) => item.id === active.id)
      const newIndex = featured.findIndex((item) => item.id === over.id)

      const newFeatured = arrayMove(featured, oldIndex, newIndex)
      setFeatured(newFeatured)

      // Save new order to backend
      setIsReordering(true)
      try {
        const reorderData = newFeatured.map((item, index) => ({
          id: item.id,
          displayOrder: index,
        }))

        const response = await fetch("/api/featured", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reorderData),
        })

        if (response.ok) {
          const updatedFeatured = await response.json()
          setFeatured(updatedFeatured)
        }
      } catch (error) {
        console.error("Failed to save order:", error)
        // Revert on error
        setFeatured(initialFeatured)
      } finally {
        setIsReordering(false)
      }
    }
  }

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    entityType: "asset" as "asset" | "docs_update" | "product_update",
    entityId: "",
    displayOrder: 0,
    endDate: "",
  })

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      entityType: "asset",
      entityId: "",
      displayOrder: featured.length,
      endDate: "",
    })
  }

  const openCreateForm = () => {
    resetForm()
    setShowForm(true)
  }

  const openEditForm = (item: FeaturedContentWithRelations) => {
    const entityId = item.asset?.id || item.docsUpdate?.id || item.productUpdate?.id || ""
    setFormData({
      title: item.title,
      description: item.description || "",
      entityType: item.entityType as "asset" | "docs_update" | "product_update",
      entityId,
      displayOrder: item.displayOrder,
      endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "",
    })
    setEditingItem(item)
  }

  const getContentOptions = () => {
    switch (formData.entityType) {
      case "asset":
        return assets.map((a) => ({ id: a.id, title: a.title, description: a.description }))
      case "docs_update":
        return docsUpdates.map((d) => ({ id: d.id, title: d.title, description: d.summary }))
      case "product_update":
        return productUpdates.map((p) => ({ id: p.id, title: p.title, description: p.content?.slice(0, 200) }))
      default:
        return []
    }
  }

  const handleEntitySelect = (entityId: string) => {
    const options = getContentOptions()
    const selected = options.find(opt => opt.id === entityId)

    if (selected) {
      setFormData(prev => ({
        ...prev,
        entityId,
        title: selected.title,
        description: selected.description || "",
      }))
    } else {
      setFormData(prev => ({ ...prev, entityId }))
    }
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        }),
      })

      if (response.ok) {
        const newItem = await response.json()
        setFeatured([...featured, newItem])
        setShowForm(false)
        resetForm()
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingItem) return

    setLoading(true)
    try {
      const response = await fetch(`/api/featured/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        }),
      })

      if (response.ok) {
        const updatedItem = await response.json()
        setFeatured(featured.map((f) => (f.id === updatedItem.id ? updatedItem : f)))
        setEditingItem(null)
        resetForm()
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/featured/${deletingItem.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setFeatured(featured.filter((f) => f.id !== deletingItem.id))
        setDeletingItem(null)
        router.refresh()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const getIcon = (entityType: string) => {
    switch (entityType) {
      case "asset":
        return <FileText className="w-5 h-5" />
      case "docs_update":
        return <BookOpen className="w-5 h-5" />
      case "product_update":
        return <Package className="w-5 h-5" />
      default:
        return <Star className="w-5 h-5" />
    }
  }

  const FormContent = (
    <div className="space-y-4">
      <Input
        label="Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Featured item title"
        required
      />

      <Input
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Optional description"
      />

      <Select
        label="Content Type"
        value={formData.entityType}
        onChange={(e) =>
          setFormData({
            ...formData,
            entityType: e.target.value as "asset" | "docs_update" | "product_update",
            entityId: "",
            title: "",
            description: "",
          })
        }
      >
        <option value="asset">Asset</option>
        <option value="docs_update">Documentation Update</option>
        <option value="product_update">Product Update</option>
      </Select>

      <Select
        label="Select Content"
        value={formData.entityId}
        onChange={(e) => handleEntitySelect(e.target.value)}
        required
      >
        <option value="">Select...</option>
        {getContentOptions().map((option) => (
          <option key={option.id} value={option.id}>
            {option.title}
          </option>
        ))}
      </Select>

      <Input
        label="Display Order"
        type="number"
        value={formData.displayOrder}
        onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
        helperText="Lower numbers appear first"
      />

      <Input
        label="End Date (optional)"
        type="date"
        value={formData.endDate}
        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
        helperText="Leave empty to show indefinitely"
      />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={openCreateForm}
        >
          Feature Content
        </Button>
      </div>

      {/* Featured List */}
      {featured.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={featured.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={`space-y-4 ${isReordering ? "opacity-50 pointer-events-none" : ""}`}>
              {featured.map((item, index) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  index={index}
                  getIcon={getIcon}
                  onEdit={() => openEditForm(item)}
                  onDelete={() => setDeletingItem(item)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card padding="lg" className="text-center">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-1">No featured content</h3>
          <p className="text-gray-500 text-sm">
            Feature content to highlight it on the partner dashboard
          </p>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false)
          resetForm()
        }}
        title="Feature Content"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={loading}>
              Add Featured
            </Button>
          </>
        }
      >
        {FormContent}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingItem}
        onClose={() => {
          setEditingItem(null)
          resetForm()
        }}
        title="Edit Featured Content"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingItem(null)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdate} loading={loading}>
              Save Changes
            </Button>
          </>
        }
      >
        {FormContent}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
        title="Remove Featured"
        message={`Are you sure you want to remove "${deletingItem?.title}" from featured content?`}
        confirmText="Remove"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
}
