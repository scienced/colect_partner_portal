"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  FileText,
  Mail,
  Play,
  FolderOpen,
  Users,
  Settings,
  Search,
  LogOut,
  ChevronDown,
  X,
  Loader2,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Session from "supertokens-web-js/recipe/session"
import type { SearchResult, AssetDrawerData } from "@/types"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/decks", label: "Sales Decks", icon: FileText },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
  { href: "/videos", label: "Videos", icon: Play },
  { href: "/assets", label: "Assets & Links", icon: FolderOpen },
  { href: "/docs-updates", label: "Documentation", icon: BookOpen },
  { href: "/who-is-who", label: "Who's Who", icon: Users },
]

interface PortalSidebarV2Props {
  isAdmin?: boolean
  user?: {
    name?: string | null
    email: string
    role: string
  } | null
  onAssetClick?: (asset: AssetDrawerData) => void
}

export function PortalSidebarV2({ isAdmin, user, onAssetClick }: PortalSidebarV2Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Clear navigating state when pathname changes
  useEffect(() => {
    setNavigatingTo(null)
  }, [pathname])

  const handleNavClick = (href: string) => (e: React.MouseEvent) => {
    if (href === pathname) return // Already on this page

    e.preventDefault()
    setNavigatingTo(href)
    startTransition(() => {
      router.push(href)
    })
  }

  const handleSignOut = async () => {
    await Session.signOut()
    router.push("/login")
  }

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.results || [])
        }
      } catch (error) {
        console.error("Search failed:", error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const handleResultClick = (result: SearchResult) => {
    setSearchOpen(false)
    setSearchQuery("")
    setSearchResults([])

    // For asset results, open the drawer instead of navigating
    // Note: onAssetClick (handleInfoClick) already updates the URL
    if (result.category === "asset" && onAssetClick && result.type) {
      onAssetClick({
        id: result.id,
        title: result.title,
        description: result.description ?? null,
        type: result.type,
        thumbnailUrl: result.thumbnailUrl ?? null,
        fileUrl: result.fileUrl ?? null,
        externalLink: result.externalLink ?? null,
        language: result.language ?? [],
        persona: result.persona ?? [],
        campaignGoal: result.campaignGoal ?? null,
        sentAt: result.sentAt ?? null,
        createdAt: result.createdAt ?? new Date().toISOString(),
        updatedAt: result.updatedAt ?? new Date().toISOString(),
      })
      return
    }

    if (result.external) {
      window.open(result.href, "_blank")
    } else {
      router.push(result.href)
    }
  }

  // Close search on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false)
        setSearchQuery("")
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Image
              src="/colect-logo.png"
              alt="Colect"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Colect</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary">
                Partner Portal
              </span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search...</span>
            <kbd className="ml-auto text-xs bg-white text-gray-400 px-1.5 py-0.5 rounded border border-gray-200">⌘K</kbd>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const isNavigating = navigatingTo === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all",
                  isActive
                    ? "bg-primary text-white font-medium"
                    : isNavigating
                    ? "bg-primary/80 text-white font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {isNavigating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Admin link */}
        {isAdmin && (
          <div className="px-3 py-2 border-t border-gray-100">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Admin Panel</span>
            </Link>
          </div>
        )}

        {/* User Profile */}
        <div className="p-3 border-t border-gray-100">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-medium text-sm">
                  {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || user?.email?.split("@")[0]}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-gray-400 transition-transform",
                userMenuOpen && "rotate-180"
              )} />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setSearchOpen(false)
              setSearchQuery("")
            }}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search assets, docs, videos, people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-gray-900 text-lg placeholder-gray-400 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Search Results */}
            <div className="max-h-[50vh] overflow-y-auto">
              {searchQuery.length >= 2 ? (
                searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.category}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {result.category === "asset" && <FileText className="w-5 h-5 text-gray-500" />}
                          {result.category === "docs" && <FileText className="w-5 h-5 text-blue-500" />}
                          {result.category === "product" && <Play className="w-5 h-5 text-green-500" />}
                          {result.category === "team" && <Users className="w-5 h-5 text-purple-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-medium truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                          {result.category}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : isSearching ? (
                  <div className="py-12 text-center text-gray-500">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                    Searching...
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                    No results found for &ldquo;{searchQuery}&rdquo;
                  </div>
                )
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                  Type to search...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
