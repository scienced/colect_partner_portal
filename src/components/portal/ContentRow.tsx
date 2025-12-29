"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Play, FileText, Mail, ExternalLink, Download, BookOpen, Plus, RefreshCw, Info, File } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAnalytics } from "@/hooks/useAnalytics"

// Helper to extract file extension from URL
function getFileExtension(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    // Remove query params and get the pathname
    const pathname = new URL(url, "https://example.com").pathname
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/)
    if (match) {
      return match[1].toUpperCase()
    }
  } catch {
    // Fallback: try simple regex on the string
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
    if (match) {
      return match[1].toUpperCase()
    }
  }
  return null
}

export interface ContentItem {
  id: string
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  type?: string
  href: string
  external?: boolean
  fileUrl?: string | null
  externalLink?: string | null
  meta?: string
  category?: "deck" | "video" | "campaign" | "asset" | "docs"
  status?: "new" | "updated"
  language?: string[]
  persona?: string[]
  campaignGoal?: string | null
  sentAt?: string | null
  createdAt?: string
  updatedAt?: string
}

interface ContentRowProps {
  title: string
  viewAllHref?: string
  items: ContentItem[]
  variant?: "default" | "large" | "docs"
  onInfoClick?: (item: ContentItem) => void
}

const categoryColors: Record<string, string> = {
  deck: "from-blue-500 to-blue-700",
  video: "from-red-500 to-red-700",
  campaign: "from-purple-500 to-purple-700",
  asset: "from-teal-500 to-teal-700",
  docs: "from-amber-500 to-amber-700",
}

const categoryIcons: Record<string, React.ReactNode> = {
  deck: <FileText className="w-8 h-8 text-white/70" />,
  video: <Play className="w-8 h-8 text-white/70" />,
  campaign: <Mail className="w-8 h-8 text-white/70" />,
  asset: <ExternalLink className="w-8 h-8 text-white/70" />,
  docs: <BookOpen className="w-8 h-8 text-white/70" />,
}

export function ContentRow({ title, viewAllHref, items, variant = "default", onInfoClick }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScrollButtons()
    window.addEventListener("resize", checkScrollButtons)
    return () => window.removeEventListener("resize", checkScrollButtons)
  }, [items])

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  if (items.length === 0) return null

  const cardWidth = variant === "large" ? "w-72" : variant === "docs" ? "w-80" : "w-56"
  const cardHeight = variant === "large" ? "h-40" : variant === "docs" ? "h-24" : "h-32"

  return (
    <div className="relative group/row py-4">
      {/* Header */}
      <div className="flex items-center justify-between px-6 mb-3 relative z-20">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            View all
          </Link>
        )}
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-gray-50 to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <div className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </div>
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-gray-50 to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <div className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
              <ChevronRight className="w-6 h-6 text-gray-700" />
            </div>
          </button>
        )}

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          onScroll={checkScrollButtons}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-6 pb-2 pt-12 -mt-10"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              variant={variant}
              onInfoClick={onInfoClick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ContentCard({
  item,
  cardWidth,
  cardHeight,
  variant,
  onInfoClick,
}: {
  item: ContentItem
  cardWidth: string
  cardHeight: string
  variant: string
  onInfoClick?: (item: ContentItem) => void
}) {
  const { trackAssetClick } = useAnalytics()
  const category = item.category || "deck"
  const gradientColor = categoryColors[category] || categoryColors.deck
  const icon = categoryIcons[category] || categoryIcons.deck

  const handleCardClick = () => {
    // Track asset click when user navigates to the asset
    const assetType = item.type || category.toUpperCase()
    trackAssetClick(item.id, item.title, assetType)
  }

  if (variant === "docs") {
    return (
      <div className={cn(
        "flex-shrink-0 group/card rounded-xl overflow-hidden bg-white border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all duration-300 relative",
        cardWidth
      )}>
        <a
          href={item.href}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noopener noreferrer" : undefined}
          className="block p-4"
          onClick={handleCardClick}
        >
          <div className="flex gap-4">
            <div className={cn(
              "w-12 h-12 rounded-lg bg-gradient-to-br flex-shrink-0 flex items-center justify-center",
              gradientColor
            )}>
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <h3
                className="font-medium text-gray-900 group-hover/card:text-primary transition-colors line-clamp-1 tooltip"
                data-tooltip={item.title}
              >
                {item.title}
              </h3>
              {item.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mt-1">{item.description}</p>
              )}
              {item.meta && (
                <p className="text-xs text-gray-400 mt-1">{item.meta}</p>
              )}
            </div>
            {item.external && <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 absolute top-4 right-4" />}
          </div>
        </a>
        {onInfoClick && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onInfoClick(item)
            }}
            className="absolute bottom-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors opacity-0 group-hover/card:opacity-100"
            title="View details"
          >
            <Info className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  const CardWrapper = item.external ? "a" : Link
  const cardProps = item.external
    ? { href: item.href, target: "_blank", rel: "noopener noreferrer" }
    : { href: item.href }

  return (
    <div className={cn(
      "flex-shrink-0 group/card rounded-xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative",
      cardWidth
    )}>
      <CardWrapper
        {...cardProps}
        className="block"
        onClick={handleCardClick}
      >
        {/* Thumbnail */}
        <div className={cn("relative overflow-hidden rounded-t-xl", cardHeight)}>
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={cn(
              "w-full h-full bg-gradient-to-br flex items-center justify-center",
              gradientColor
            )}>
              {icon}
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/40 transition-colors flex items-center justify-center">
            {category === "video" && (
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity scale-75 group-hover/card:scale-100">
                <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
              </div>
            )}
            {category === "deck" && item.fileUrl && (
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity scale-75 group-hover/card:scale-100">
                <Download className="w-5 h-5 text-gray-900" />
              </div>
            )}
          </div>

          {/* Category Badge */}
          <div className="absolute top-2 left-2">
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-md bg-black/60 text-white capitalize"
            )}>
              {category}
            </span>
          </div>

          {/* External indicator */}
          {item.external && (
            <div className="absolute top-2 right-2">
              <ExternalLink className="w-4 h-4 text-white drop-shadow-lg" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 pr-10">
          <h3
            className="font-medium text-gray-900 line-clamp-1 group-hover/card:text-primary transition-colors tooltip"
            data-tooltip={item.title}
          >
            {item.title}
          </h3>
          {item.description && (
            <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
          )}
          {(item.meta || item.status || (item.fileUrl && ["deck", "campaign", "asset"].includes(category))) && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {item.status && (
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
                  item.status === "new"
                    ? "bg-green-50 text-green-700"
                    : "bg-blue-50 text-blue-700"
                )}>
                  {item.status === "new" ? (
                    <Plus className="w-3 h-3" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  {item.status === "new" ? "New" : "Updated"}
                </span>
              )}
              {/* File extension badge */}
              {item.fileUrl && ["deck", "campaign", "asset"].includes(category) && getFileExtension(item.fileUrl) && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                  <File className="w-3 h-3" />
                  {getFileExtension(item.fileUrl)}
                </span>
              )}
              {item.meta && (
                <p className="text-xs text-gray-400">{item.meta}</p>
              )}
            </div>
          )}
        </div>
      </CardWrapper>

      {/* Info Button */}
      {onInfoClick && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onInfoClick(item)
          }}
          className="absolute bottom-2.5 right-2.5 p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors opacity-0 group-hover/card:opacity-100 z-10"
          title="View details"
        >
          <Info className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
