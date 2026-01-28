"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DocsUpdate } from "@prisma/client"
import { Card } from "@/components/ui/Card"
import { Button, IconButton } from "@/components/ui/Button"
import { Input, Textarea, Checkbox } from "@/components/ui/Input"
import { Modal, ConfirmModal } from "@/components/ui/Modal"
import { StatusBadge } from "@/components/layout/SectionHeader"
import {
  Plus,
  BookOpen,
  ExternalLink,
  Edit,
  Trash2,
} from "lucide-react"

interface DocsUpdatesListProps {
  initialDocs: DocsUpdate[]
}

export function DocsUpdatesList({ initialDocs }: DocsUpdatesListProps) {
  const router = useRouter()
  const [docs, setDocs] = useState(initialDocs)
  const [showForm, setShowForm] = useState(false)
  const [editingDoc, setEditingDoc] = useState<DocsUpdate | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<DocsUpdate | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    deepLink: "",
    category: "",
    publishedAt: null as string | null,
  })

  const resetForm = () => {
    setFormData({
      title: "",
      summary: "",
      deepLink: "",
      category: "",
      publishedAt: null,
    })
  }

  const openCreateForm = () => {
    resetForm()
    setShowForm(true)
  }

  const openEditForm = (doc: DocsUpdate) => {
    setFormData({
      title: doc.title,
      summary: doc.summary,
      deepLink: doc.deepLink,
      category: doc.category || "",
      publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : null,
    })
    setEditingDoc(doc)
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/docs-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          publishedAt: formData.publishedAt ? new Date(formData.publishedAt) : null,
        }),
      })

      if (response.ok) {
        const newDoc = await response.json()
        setDocs([newDoc, ...docs])
        setShowForm(false)
        resetForm()
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingDoc) return

    setLoading(true)
    try {
      const response = await fetch(`/api/docs-updates/${editingDoc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          publishedAt: formData.publishedAt ? new Date(formData.publishedAt) : null,
        }),
      })

      if (response.ok) {
        const updatedDoc = await response.json()
        setDocs(docs.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)))
        setEditingDoc(null)
        resetForm()
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingDoc) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/docs-updates/${deletingDoc.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setDocs(docs.filter((d) => d.id !== deletingDoc.id))
        setDeletingDoc(null)
        router.refresh()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const FormContent = (
    <div className="space-y-4">
      <Input
        label="Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      <Textarea
        label="Summary"
        value={formData.summary}
        onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
        rows={3}
        required
      />

      <Input
        label="Documentation Link"
        value={formData.deepLink}
        onChange={(e) => setFormData({ ...formData, deepLink: e.target.value })}
        placeholder="https://docs.example.com/..."
        required
      />

      <Input
        label="Category"
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        placeholder="e.g., API, Integration, Getting Started"
      />

      <Checkbox
        label="Publish immediately"
        description="Make this update visible to partners"
        checked={!!formData.publishedAt}
        onChange={(e) =>
          setFormData({
            ...formData,
            publishedAt: e.target.checked ? new Date().toISOString() : null,
          })
        }
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
          Add Update
        </Button>
      </div>

      {/* Docs List */}
      {docs.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {docs.map((doc) => (
            <Card key={doc.id} padding="md">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{doc.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{doc.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.publishedAt ? (
                        <StatusBadge status="success">Published</StatusBadge>
                      ) : (
                        <StatusBadge status="warning">Draft</StatusBadge>
                      )}
                      {doc.category && (
                        <StatusBadge status="info">{doc.category}</StatusBadge>
                      )}
                      <IconButton
                        icon={<Edit className="w-4 h-4" />}
                        variant="primary"
                        size="sm"
                        onClick={() => openEditForm(doc)}
                      />
                      <IconButton
                        icon={<Trash2 className="w-4 h-4" />}
                        variant="danger"
                        size="sm"
                        onClick={() => setDeletingDoc(doc)}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <a
                      href={doc.deepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View documentation
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <p className="text-gray-500">No documentation updates yet</p>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false)
          resetForm()
        }}
        title="Add Documentation Update"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={loading}>
              Create Update
            </Button>
          </>
        }
      >
        {FormContent}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingDoc}
        onClose={() => {
          setEditingDoc(null)
          resetForm()
        }}
        title="Edit Documentation Update"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingDoc(null)} disabled={loading}>
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
        open={!!deletingDoc}
        onClose={() => setDeletingDoc(null)}
        onConfirm={handleDelete}
        title="Delete Update"
        message={`Are you sure you want to delete "${deletingDoc?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
}
