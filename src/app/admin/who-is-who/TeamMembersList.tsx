"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { TeamMember } from "@prisma/client"
import { Card } from "@/components/ui/Card"
import { Button, IconButton } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { Modal, ConfirmModal } from "@/components/ui/Modal"
import {
  Plus,
  User,
  Mail,
  Linkedin,
  Edit,
  Trash2,
} from "lucide-react"

interface TeamMembersListProps {
  initialMembers: TeamMember[]
}

export function TeamMembersList({ initialMembers }: TeamMembersListProps) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    department: "",
    email: "",
    linkedIn: "",
    photoUrl: "",
    displayOrder: 0,
  })

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      department: "",
      email: "",
      linkedIn: "",
      photoUrl: "",
      displayOrder: 0,
    })
  }

  const openCreateForm = () => {
    resetForm()
    setShowForm(true)
  }

  const openEditForm = (member: TeamMember) => {
    setFormData({
      name: member.name,
      role: member.role,
      department: member.department,
      email: member.email || "",
      linkedIn: member.linkedIn || "",
      photoUrl: member.photoUrl || "",
      displayOrder: member.displayOrder,
    })
    setEditingMember(member)
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const newMember = await response.json()
        setMembers([...members, newMember])
        setShowForm(false)
        resetForm()
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingMember) return

    setLoading(true)
    try {
      const response = await fetch(`/api/team-members/${editingMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedMember = await response.json()
        setMembers(members.map((m) => (m.id === updatedMember.id ? updatedMember : m)))
        setEditingMember(null)
        resetForm()
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingMember) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/team-members/${deletingMember.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMembers(members.filter((m) => m.id !== deletingMember.id))
        setDeletingMember(null)
        router.refresh()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Group members by department
  const groupedByDepartment = members.reduce((acc, member) => {
    if (!acc[member.department]) {
      acc[member.department] = []
    }
    acc[member.department].push(member)
    return acc
  }, {} as Record<string, TeamMember[]>)

  const FormContent = (
    <div className="space-y-4">
      <Input
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <Input
        label="Role"
        value={formData.role}
        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
        placeholder="e.g., Partner Manager"
        required
      />

      <Input
        label="Department"
        value={formData.department}
        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
        placeholder="e.g., Sales, Support, Engineering"
        required
      />

      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="name@colect.io"
      />

      <Input
        label="LinkedIn URL"
        value={formData.linkedIn}
        onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
        placeholder="https://linkedin.com/in/..."
      />

      <Input
        label="Photo URL"
        value={formData.photoUrl}
        onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
        placeholder="https://..."
        helperText="URL to profile photo"
      />

      <Input
        label="Display Order"
        type="number"
        value={formData.displayOrder}
        onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
        helperText="Lower numbers appear first"
      />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={openCreateForm}
        >
          Add Team Member
        </Button>
      </div>

      {/* Members grouped by department */}
      {Object.entries(groupedByDepartment).map(([department, deptMembers]) => (
        <div key={department}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {department}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deptMembers.map((member) => (
              <Card key={member.id} padding="md">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                    {member.photoUrl ? (
                      <Image
                        src={member.photoUrl}
                        alt={member.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{member.name}</h4>
                        <p className="text-sm text-gray-600">{member.role}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <IconButton
                          icon={<Edit className="w-4 h-4" />}
                          variant="primary"
                          size="sm"
                          onClick={() => openEditForm(member)}
                        />
                        <IconButton
                          icon={<Trash2 className="w-4 h-4" />}
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingMember(member)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="text-gray-400 hover:text-primary"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                      {member.linkedIn && (
                        <a
                          href={member.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-primary"
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {members.length === 0 && (
        <Card padding="lg" className="text-center">
          <p className="text-gray-500">No team members yet</p>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false)
          resetForm()
        }}
        title="Add Team Member"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={loading}>
              Add Member
            </Button>
          </>
        }
      >
        {FormContent}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingMember}
        onClose={() => {
          setEditingMember(null)
          resetForm()
        }}
        title="Edit Team Member"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingMember(null)} disabled={loading}>
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
        open={!!deletingMember}
        onClose={() => setDeletingMember(null)}
        onConfirm={handleDelete}
        title="Delete Team Member"
        message={`Are you sure you want to delete "${deletingMember?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
}
