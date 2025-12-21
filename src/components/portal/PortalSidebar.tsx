"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  FileText,
  Mail,
  Play,
  FolderOpen,
  Users,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/decks", label: "Sales Decks", icon: FileText },
  { href: "/campaigns", label: "Campaigns & Emails", icon: Mail },
  { href: "/videos", label: "Videos", icon: Play },
  { href: "/assets", label: "Assets & Links", icon: FolderOpen },
  { href: "/who-is-who", label: "Who's Who", icon: Users },
]

interface PortalSidebarProps {
  isAdmin?: boolean
}

export function PortalSidebar({ isAdmin }: PortalSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Colect</h2>
            <p className="text-xs text-gray-500">Partner Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer - Admin link */}
      {isAdmin && (
        <div className="p-4 border-t border-gray-200">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Admin Panel</span>
          </Link>
        </div>
      )}
    </aside>
  )
}
