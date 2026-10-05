"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Button, IconButton } from "@/components/ui/Button"
import { ConfirmModal } from "@/components/ui/Modal"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { AudienceBadges } from "@/components/portal/AudienceBadges"
import { Edit, ImageIcon, Megaphone, Plus, Trash2 } from "lucide-react"
import type { SerializedAdSet } from "@/lib/adSets"
import { AdSetForm } from "./AdSetForm"

export function SocialAdsList({ initialItems }: { initialItems: SerializedAdSet[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SerializedAdSet | null>(null)
  const [deleting, setDeleting] = useState<SerializedAdSet | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const save = async (data: Record<string, unknown>) => {
    const res = await fetch(editing ? `/api/social-ads/${editing.id}` : "/api/social-ads", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json.error === "Validation error" ? json.details?.map((d: { message: string }) => d.message).join("\n") : json.error)
      return
    }
    setItems((prev) => (editing ? prev.map((i) => (i.id === json.id ? json : i)) : [json, ...prev]))
    setFormOpen(false)
    setEditing(null)
    router.refresh()
  }

  const remove = async () => {
    if (!deleting) return
    setIsDeleting(true)
    const res = await fetch(`/api/assets/${deleting.id}`, { method: "DELETE" })
    setIsDeleting(false)
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== deleting.id))
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          New ad set
        </Button>
      </div>

      {items.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No ad sets yet. Drop a campaign&apos;s visuals (or a zip) and its copy into a new ad set.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} padding="md">
              <div className="flex items-start gap-4">
                <div className="w-28 h-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    <div className="flex gap-1 flex-shrink-0">
                      <IconButton
                        icon={<Edit className="w-4 h-4" />}
                        size="sm"
                        onClick={() => {
                          setEditing(item)
                          setFormOpen(true)
                        }}
                      />
                      <IconButton icon={<Trash2 className="w-4 h-4" />} variant="danger" size="sm" onClick={() => setDeleting(item)} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {item.media.length} visual{item.media.length === 1 ? "" : "s"} · {item.copies.length} copy version
                    {item.copies.length === 1 ? "" : "s"}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <StatusBadge status="neutral">LinkedIn</StatusBadge>
                    {item.published ? (
                      <StatusBadge status="success">Published</StatusBadge>
                    ) : (
                      <StatusBadge status="warning">Draft</StatusBadge>
                    )}
                    <AudienceBadges visibility={item.visibility} brand={item.brand} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AdSetForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={save}
        initialData={editing}
      />
      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete ad set"
        message={`Delete "${deleting?.title}" with all its visuals and copy? This can't be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
}
