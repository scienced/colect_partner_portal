"use client"

import { useState, useEffect } from "react"
import { AllowedDomain } from "@prisma/client"
import { PageHeader, StatusBadge } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Plus, Edit2, Trash2, Globe, Building2 } from "lucide-react"

export default function PartnersPage() {
  const [domains, setDomains] = useState<AllowedDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDomain, setEditingDomain] = useState<AllowedDomain | null>(null)
  const [formData, setFormData] = useState({
    domain: "",
    companyName: "",
    notes: "",
    isActive: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/allowed-domains")
      if (res.ok) {
        const data = await res.json()
        setDomains(data)
      }
    } catch (error) {
      console.error("Failed to fetch domains:", error)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingDomain(null)
    setFormData({ domain: "", companyName: "", notes: "", isActive: true })
    setModalOpen(true)
  }

  const openEditModal = (domain: AllowedDomain) => {
    setEditingDomain(domain)
    setFormData({
      domain: domain.domain,
      companyName: domain.companyName || "",
      notes: domain.notes || "",
      isActive: domain.isActive,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const url = editingDomain
        ? `/api/allowed-domains/${editingDomain.id}`
        : "/api/allowed-domains"
      const method = editingDomain ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setModalOpen(false)
        fetchDomains()
      } else {
        const error = await res.json()
        alert(error.error || "Failed to save domain")
      }
    } catch (error) {
      console.error("Save error:", error)
      alert("Failed to save domain")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this partner domain?")) {
      return
    }

    try {
      const res = await fetch(`/api/allowed-domains/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchDomains()
      }
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

  const toggleActive = async (domain: AllowedDomain) => {
    try {
      const res = await fetch(`/api/allowed-domains/${domain.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !domain.isActive }),
      })
      if (res.ok) {
        fetchDomains()
      }
    } catch (error) {
      console.error("Toggle error:", error)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner Access"
        description="Manage which email domains can access the partner portal"
        actions={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openAddModal}>
            Add Domain
          </Button>
        }
      />

      <Card padding="md" className="bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> Only users with email addresses from approved domains can sign in.
          When someone tries to log in with an unauthorized domain, they&apos;ll see an error message.
        </p>
      </Card>

      {loading ? (
        <Card padding="lg" className="text-center">
          <p className="text-gray-500">Loading...</p>
        </Card>
      ) : domains.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No partner domains configured yet</p>
          <Button variant="primary" onClick={openAddModal}>
            Add your first partner domain
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <Card key={domain.id} padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">@{domain.domain}</span>
                      <StatusBadge status={domain.isActive ? "success" : "neutral"}>
                        {domain.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                    </div>
                    {domain.companyName && (
                      <p className="text-sm text-gray-600">{domain.companyName}</p>
                    )}
                    {domain.notes && (
                      <p className="text-xs text-gray-400 mt-1">{domain.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(domain)}
                  >
                    {domain.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(domain)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(domain.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDomain ? "Edit Partner Domain" : "Add Partner Domain"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={saving}>
              {editingDomain ? "Save Changes" : "Add Domain"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Domain"
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            placeholder="partner-company.com"
            helperText="Enter the domain without @ (e.g., partner-company.com)"
            required
          />
          <Input
            label="Company Name"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            placeholder="Partner Company Inc."
          />
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Internal notes about this partner..."
            rows={2}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Domain is active (users can sign in)</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
