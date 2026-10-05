"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Button, IconButton } from "@/components/ui/Button"
import { ConfirmModal } from "@/components/ui/Modal"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { AudienceBadges } from "@/components/portal/AudienceBadges"
import { Edit, Megaphone, Plus, Search, Trash2 } from "lucide-react"
import type { SerializedAdSet } from "@/lib/adSets"
import { AdSetForm } from "./AdSetForm"
import { AD_PLATFORM_OPTIONS, adPlatformLabel } from "@/lib/adPlatforms"
import { Input } from "@/components/ui/Input"

export function AdsList({ initialItems }: { initialItems: SerializedAdSet[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SerializedAdSet | null>(null)
  const [deleting, setDeleting] = useState<SerializedAdSet | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState("")
  const searchParams = useSearchParams()

  // Deep link from the dashboard's "Recent Assets": /admin/ads?edit=<id>
  useEffect(() => {
    const id = searchParams.get("edit")
    const match = id ? items.find((i) => i.id === id) : null
    if (match) {
      setEditing(match)
      setFormOpen(true)
      router.replace("/admin/ads", { scroll: false })
    }
  }, [searchParams, items, router])

  const save = async (data: Record<string, unknown>) => {
    const res = await fetch(editing ? `/api/ads/${editing.id}` : "/api/ads", {
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

  const q = search.trim().toLowerCase()
  const filtered = items.filter(
    (i) =>
      (!platformFilter || i.adPlatform === platformFilter) &&
      (!q ||
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.copies.some((c) => c.introText.toLowerCase().includes(q) || c.headline?.toLowerCase().includes(q)))
  )

  return (
    <div className="space-y-4">
      {/* Toolbar — same layout as the Assets list */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search ads and copy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All platforms</option>
            {AD_PLATFORM_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          Add Ad Set
        </Button>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} padding="md">
              <div className="flex items-start gap-3">
                <div className="w-20 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Megaphone className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 whitespace-nowrap">
                        {item.media.length} visual{item.media.length === 1 ? "" : "s"} · {item.copies.length} cop{item.copies.length === 1 ? "y" : "ies"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <IconButton
                        icon={<Edit className="w-4 h-4" />}
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setEditing(item)
                          setFormOpen(true)
                        }}
                      />
                      <IconButton icon={<Trash2 className="w-4 h-4" />} variant="danger" size="sm" onClick={() => setDeleting(item)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <StatusBadge status="neutral">{adPlatformLabel(item.adPlatform)}</StatusBadge>
                    {item.published ? (
                      <StatusBadge status="success">Published</StatusBadge>
                    ) : (
                      <StatusBadge status="warning">Draft</StatusBadge>
                    )}
                    {item.availableLanguages.map((lang) => (
                      <StatusBadge key={lang} status="info">{lang}</StatusBadge>
                    ))}
                    <AudienceBadges visibility={item.visibility} brand={item.brand} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {items.length === 0
              ? "No ad sets yet. Drop a campaign's visuals (or a zip) and its copy into a new ad set."
              : "No ad sets match your search."}
          </p>
        </Card>
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
