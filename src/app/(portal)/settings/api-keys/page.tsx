"use client"

import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/swr"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card } from "@/components/ui/Card"
import { Modal } from "@/components/ui/Modal"
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react"

interface KeyRow {
  id: string
  label: string
  prefix: string
  display: string
  scopes: string[]
  creatorEmail: string
  isMine: boolean
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
  lastUsedIp: string | null
  revokedAt: string | null
  status: "active" | "expired" | "revoked"
}

interface KeysResponse {
  items: KeyRow[]
  limits: { maxActiveKeysPerUser: number; defaultTtlDays: number }
  canCreateWriteKeys?: boolean
}

export default function ApiKeysPage() {
  const { data, error, isLoading, mutate } = useSWR<KeysResponse>(
    "/api/portal/api-keys",
    fetcher
  )

  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<KeyRow | null>(null)

  const keys = data?.items ?? []
  const activeMineCount = keys.filter((k) => k.isMine && k.status === "active").length
  const maxKeys = data?.limits.maxActiveKeysPerUser ?? 5
  const atLimit = activeMineCount >= maxKeys

  return (
    <div className="max-w-5xl">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Key className="w-6 h-6 text-primary" />
              API keys
            </h1>
            <p className="text-gray-600 mt-1">
              Personal keys for the partner portal REST API and the Claude MCP
              integration. Keys are visible to everyone at your domain — see why
              below.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setCreateOpen(true)}
            icon={<Plus className="w-4 h-4" />}
            disabled={atLimit}
          >
            Create new key
          </Button>
        </div>

        <DomainTrustCallout />

        <div className="mt-4 flex items-center gap-3 text-sm flex-wrap">
          <span className="text-gray-500">Docs:</span>
          <a
            href="/docs/api"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            API reference <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <span className="text-gray-300">·</span>
          <a
            href="/docs/mcp"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            MCP setup guide <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <span className="text-gray-300">·</span>
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            openapi.json <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      <div className="mb-4 flex items-center gap-3 text-sm text-gray-500">
        <span>{keys.length} key{keys.length === 1 ? "" : "s"} at your domain</span>
        {atLimit && (
          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
            You have {activeMineCount} of {maxKeys} active keys — revoke one to create more.
          </span>
        )}
      </div>

      {isLoading && <Card padding="lg" className="text-gray-500">Loading…</Card>}
      {error && (
        <Card padding="lg" className="border-red-200 bg-red-50 text-red-700">
          Couldn&apos;t load API keys. Try refreshing.
        </Card>
      )}

      {!isLoading && !error && keys.length === 0 && (
        <Card padding="lg" className="text-center text-gray-600">
          <Key className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-900">No API keys yet</p>
          <p className="text-sm mt-1">
            Create your first key to use the partner portal API or wire it up to
            Claude via MCP.
          </p>
          <div className="mt-4 flex justify-center gap-3 flex-wrap text-sm">
            <a className="text-primary hover:underline" href="/docs/api" target="_blank" rel="noreferrer">
              API documentation
              <ExternalLink className="inline w-3 h-3 ml-1" />
            </a>
            <a className="text-primary hover:underline" href="/docs/mcp" target="_blank" rel="noreferrer">
              MCP setup guide
              <ExternalLink className="inline w-3 h-3 ml-1" />
            </a>
          </div>
        </Card>
      )}

      {keys.length > 0 && (
        <div className="space-y-3">
          {keys.map((k) => (
            <KeyRowCard key={k.id} k={k} onRevoke={() => setRevokeTarget(k)} />
          ))}
        </div>
      )}

      <CreateKeyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultTtlDays={data?.limits.defaultTtlDays ?? 90}
        canCreateWriteKeys={!!data?.canCreateWriteKeys}
        onCreated={(plaintext) => {
          setCreateOpen(false)
          setNewKeyPlaintext(plaintext)
          mutate()
        }}
      />
      <NewKeyDisplayModal
        plaintext={newKeyPlaintext}
        onClose={() => setNewKeyPlaintext(null)}
      />
      <RevokeConfirmModal
        target={revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onRevoked={() => {
          setRevokeTarget(null)
          mutate()
        }}
      />
    </div>
  )
}

function DomainTrustCallout() {
  return (
    <Card padding="md" className="mt-4 border-amber-200 bg-amber-50 text-amber-900">
      <div className="flex gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Why everyone at your domain can see and revoke these keys</p>
          <p className="mt-1 leading-relaxed text-amber-800">
            Access to the partner portal is gated by your company&apos;s email
            domain — there&apos;s no per-user invitation. So the practical
            trust unit is the partner, not an individual. To match that, anyone
            with a portal login at your domain can see the active keys and
            revoke any that look suspicious. Keep this in mind when labelling
            your keys (use something recognisable, like
            &quot;Sarah&apos;s laptop MCP&quot;).
          </p>
        </div>
      </div>
    </Card>
  )
}

function KeyRowCard({ k, onRevoke }: { k: KeyRow; onRevoke: () => void }) {
  const isRevoked = k.status === "revoked"
  const isExpired = k.status === "expired"
  return (
    <Card padding="md" className={isRevoked || isExpired ? "opacity-60" : ""}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{k.label}</h3>
            {k.isMine && (
              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                yours
              </span>
            )}
            <StatusBadge status={k.status} />
            {k.scopes.includes("write:content") && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                Read &amp; write
              </span>
            )}
          </div>
          <div className="mt-1 font-mono text-sm text-gray-500">{k.display}</div>
          <div className="mt-2 text-sm text-gray-500 space-y-0.5">
            <div>Created by {k.creatorEmail} · {fmtDate(k.createdAt)}</div>
            <div>
              {k.lastUsedAt
                ? <>Last used {fmtRelative(k.lastUsedAt)}{k.lastUsedIp ? ` from ${k.lastUsedIp}` : ""}</>
                : "Never used"}
            </div>
            {k.expiresAt && (
              <div>Expires {fmtDate(k.expiresAt)}</div>
            )}
          </div>
        </div>
        {!isRevoked && (
          <Button
            variant="secondary"
            onClick={onRevoke}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Revoke
          </Button>
        )}
      </div>
    </Card>
  )
}

function StatusBadge({ status }: { status: KeyRow["status"] }) {
  if (status === "revoked") {
    return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">Revoked</span>
  }
  if (status === "expired") {
    return <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">Expired</span>
  }
  return <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Active</span>
}

function CreateKeyModal({
  open,
  onClose,
  defaultTtlDays,
  canCreateWriteKeys,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  defaultTtlDays: number
  canCreateWriteKeys: boolean
  onCreated: (plaintext: string) => void
}) {
  const [label, setLabel] = useState("")
  const [allowWrite, setAllowWrite] = useState(false)
  const [ttl, setTtl] = useState<string>(String(defaultTtlDays))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const ttlDays =
        ttl === "never" ? null : Math.max(1, Math.min(365, parseInt(ttl, 10) || defaultTtlDays))
      const res = await fetch("/api/portal/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, ttlDays, allowWrite: canCreateWriteKeys && allowWrite }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Couldn't create key")
        return
      }
      onCreated(json.plaintext)
      setLabel("")
      setTtl(String(defaultTtlDays))
      setAllowWrite(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create API key"
      description="You'll see the full key once after creation. Store it like a password."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!label.trim() || submitting}
          >
            Create key
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          label="Label"
          placeholder="e.g. Sarah's laptop MCP"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={80}
          required
          disabled={submitting}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expires after</label>
          <select
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="30">30 days</option>
            <option value="90">90 days (recommended)</option>
            <option value="180">180 days</option>
            <option value="365">365 days</option>
            <option value="never">No expiry</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Shorter is safer. You can always create a new one.
          </p>
        </div>
        {canCreateWriteKeys && (
          <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <input
              type="checkbox"
              checked={allowWrite}
              onChange={(e) => setAllowWrite(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-amber-900">
              <span className="font-medium">Allow creating and editing content</span>
              <span className="block text-xs mt-0.5">
                Lets an agent upload files and create or edit assets, including who can see them.
                It can&apos;t delete anything. Only admins can create these keys.
              </span>
            </span>
          </label>
        )}
        {error && (
          <p className="text-sm text-red-600 flex items-start gap-1">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </form>
    </Modal>
  )
}

function NewKeyDisplayModal({
  plaintext,
  onClose,
}: {
  plaintext: string | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (!plaintext) return
    await navigator.clipboard.writeText(plaintext)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Modal
      open={!!plaintext}
      onClose={onClose}
      title="Your new API key"
      description="This is the only time you'll see it. Copy it now and store it safely."
      size="lg"
      closeOnOverlayClick={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="primary" onClick={onClose}>I&apos;ve saved it</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="border border-amber-200 bg-amber-50 rounded p-3 flex gap-2 text-amber-900 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-700" />
          <span>
            Treat this key like a password. If it ever leaks, revoke it from
            this page immediately.
          </span>
        </div>
        <div className="bg-gray-900 text-gray-100 font-mono text-sm rounded p-3 break-all">
          {plaintext}
        </div>
        <Button
          variant="secondary"
          onClick={copy}
          icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        >
          {copied ? "Copied" : "Copy to clipboard"}
        </Button>
      </div>
    </Modal>
  )
}

function RevokeConfirmModal({
  target,
  onClose,
  onRevoked,
}: {
  target: KeyRow | null
  onClose: () => void
  onRevoked: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRevoke = async () => {
    if (!target) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/api-keys/${target.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || "Failed to revoke")
        return
      }
      onRevoked()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Revoke API key?"
      description={
        target
          ? `${target.label} (${target.display}) will stop working immediately. This cannot be undone.`
          : undefined
      }
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleRevoke} loading={submitting}>
            Revoke key
          </Button>
        </div>
      }
    >
      {error && (
        <p className="text-sm text-red-600 flex items-start gap-1">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </Modal>
  )
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return iso
  }
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const days = Math.round(hr / 24)
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`
  return fmtDate(iso)
}
