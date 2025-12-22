"use client"

import { SuperTokensProvider } from "@/components/auth/SuperTokensProvider"
import { PortalSidebarV2 } from "@/components/portal/PortalSidebarV2"

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

  return (
    <SuperTokensProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <PortalSidebarV2 user={user} isAdmin={isAdmin} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </SuperTokensProvider>
  )
}
