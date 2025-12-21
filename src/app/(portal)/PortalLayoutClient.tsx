"use client"

import { SuperTokensProvider } from "@/components/auth/SuperTokensProvider"
import { PortalHeader } from "@/components/portal/PortalHeader"
import { PortalSidebar } from "@/components/portal/PortalSidebar"

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
        <PortalSidebar isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col">
          <PortalHeader user={user} />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </SuperTokensProvider>
  )
}
