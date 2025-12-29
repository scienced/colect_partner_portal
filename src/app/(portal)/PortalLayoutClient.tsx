"use client"

import { useState } from "react"
import { SuperTokensProvider } from "@/components/auth/SuperTokensProvider"
import { PortalSidebarV2 } from "@/components/portal/PortalSidebarV2"
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker"
import { AssetInfoDrawer } from "@/components/portal/AssetInfoDrawer"

interface AssetInfo {
  id: string
  title: string
  description?: string | null
  type: string
  category?: string
  thumbnailUrl?: string | null
  fileUrl?: string | null
  externalLink?: string | null
  language?: string[]
  persona?: string[]
  campaignGoal?: string | null
  sentAt?: string | null
  createdAt: string
  updatedAt: string
}

interface PortalLayoutClientProps {
  user: {
    name?: string | null
    email: string
    role: string
  } | null
  children: React.ReactNode
}

export function PortalLayoutClient({ user, children }: PortalLayoutClientProps) {
  const isAdmin = user?.role === "ADMIN"
  const [selectedAsset, setSelectedAsset] = useState<AssetInfo | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleAssetClick = (asset: AssetInfo) => {
    setSelectedAsset(asset)
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
  }

  return (
    <SuperTokensProvider>
      <AnalyticsTracker />
      <div className="min-h-screen bg-gray-50 flex">
        <PortalSidebarV2 user={user} isAdmin={isAdmin} onAssetClick={handleAssetClick} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
      <AssetInfoDrawer
        asset={selectedAsset}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />
    </SuperTokensProvider>
  )
}
