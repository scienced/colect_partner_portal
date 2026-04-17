"use client"

import { useRef, useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Play, FileText, Mail, ExternalLink, Download, BookOpen, Plus, RefreshCw, Calendar, Sparkles } from "lucide-react"
import { cn, getDateStatus } from "@/lib/utils"
import { useAnalytics } from "@/hooks/useAnalytics"
import { PinnedBadge } from "@/components/portal/PinnedBadge"

export interface ContentItem {
  id: string
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  blurDataUrl?: string | null
  type?: string
  href: string
  external?: boolean
  fileUrl?: string | null
  externalLink?: string | null
  meta?: string
  category?: "deck" | "video" | "campaign" | "asset" | "docs"
  status?: "new" | "updated"
  availableLanguages?: string[]
  persona?: string[]
  /** For docs-category items: distinguishes auto-fetched GitBook entries
   *  from curated manual entries so the UI can render them differently. */
  source?: "manual" | "gitbook"
  /** For docs items from gitbook: high-level group label
   *  (e.g., "User docs" / "Admin docs"). */
  spaceLabel?: string
  /** For docs items from gitbook: specific space name
   *  (e.g., "Creator Studio" or "SOAP API"). */
  spaceName?: string
  /** For docs items from gitbook: true when the page has never been edited
   *  since creation. Manual entries ignore this. */
  isNew?: boolean
  campaignGoal?: string | null
  sentAt?: string | null
  createdAt?: string
  updatedAt?: string
  isPinned?: boolean
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

// Helper functions for quick action labels
function getFileLabel(fileUrl: string): string {
  const ext = fileUrl.split('.').pop()?.split('?')[0]?.toUpperCase()
  return ext || "Download"
}

function getExternalLabel(category: string): string {
  switch (category) {
    case "deck": return "Slides"
    case "video": return "Watch"
    case "campaign": return "View"
    case "docs": return "Read"
    default: return "Open"
  }
}

// Quick action pill component
function QuickActionPill({
  href,
  icon,
  label,
  onClick,
}: {
  href: string
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-primary/10 text-gray-600 hover:text-primary rounded-md transition-colors"
    >
      {icon}
      {label}
    </a>
  )
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
  const { trackAssetClick, trackAssetDownload } = useAnalytics()
  const category = item.category || "deck"
  const gradientColor = categoryColors[category] || categoryColors.deck
  const icon = categoryIcons[category] || categoryIcons.deck

  const handleCardClick = () => {
    // Card click now opens the side panel
    if (onInfoClick) {
      onInfoClick(item)
    }
  }

  // Handlers for quick action links
  const handleQuickDownload = () => {
    const assetType = item.type || category.toUpperCase()
    trackAssetDownload(item.id, item.title, assetType)
  }

  const handleQuickExternalClick = () => {
    const assetType = item.type || category.toUpperCase()
    trackAssetClick(item.id, item.title, assetType)
  }

  // Determine which quick actions to show
  const showFileDownload = item.fileUrl && ["deck", "campaign", "asset"].includes(category)
  const showExternalLink = item.externalLink || (category === "video" && item.href) || (category === "docs" && item.href)
  const externalLinkHref = item.externalLink || item.href

  if (variant === "docs") {
    const isGitBook = item.source === "gitbook"
    // Prefer the specific space name when it differs from the group label
    // (e.g., "Creator Studio" vs "User docs"). Otherwise just show the group.
    const gitbookOrigin =
      item.spaceName && item.spaceLabel && item.spaceName !== item.spaceLabel
        ? `${item.spaceLabel} · ${item.spaceName}`
        : item.spaceLabel || item.spaceName || null
    return (
      <div
        className={cn(
          "flex-shrink-0 group/card rounded-xl overflow-hidden bg-white border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer relative",
          cardWidth
        )}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
      >
        {/* Pinned Badge (manual entries only) */}
        {item.isPinned && !isGitBook && (
          <div className="absolute top-2 right-2 z-10">
            <PinnedBadge />
          </div>
        )}
        {/* New badge (gitbook entries with createdAt==updatedAt) */}
        {isGitBook && item.isNew && (
          <div className="absolute top-2 right-2 z-10">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-700">
              <Plus className="w-3 h-3" />
              New
            </span>
          </div>
        )}
        <div className="p-4">
          <div className="flex gap-4">
            {/* Icon tile — amber gradient for curated manual entries,
                muted slate gradient + Sparkles icon for auto-fetched ones. */}
            <div
              className={cn(
                "w-12 h-12 rounded-lg bg-gradient-to-br flex-shrink-0 flex items-center justify-center",
                isGitBook ? "from-slate-400 to-slate-600" : gradientColor
              )}
            >
              {isGitBook ? (
                <Sparkles className="w-6 h-6 text-white" />
              ) : (
                <BookOpen className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className="font-medium text-gray-900 group-hover/card:text-primary transition-colors line-clamp-1 tooltip"
                data-tooltip={item.title}
              >
                {item.title}
              </h3>
              {/* Row 1: description (both sources, when available) */}
              {item.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                  {item.description}
                </p>
              )}
              {/* Row 2: GitBook origin line (only when there's no description,
                  to avoid crowding the card) */}
              {isGitBook && gitbookOrigin && !item.description && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-slate-400" />
                  {gitbookOrigin}
                </p>
              )}
              {/* Row 3: timestamp meta */}
              {item.meta && (
                <p className="text-xs text-gray-400 mt-1">
                  {isGitBook && gitbookOrigin && item.description
                    ? `${gitbookOrigin} · ${item.meta}`
                    : item.meta}
                </p>
              )}
            </div>
          </div>
          {/* Quick Actions */}
          {showExternalLink && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <QuickActionPill
                href={externalLinkHref}
                icon={<ExternalLink className="w-3 h-3" />}
                label="Read"
                onClick={handleQuickExternalClick}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex-shrink-0 group/card rounded-xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer",
        cardWidth
      )}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
    >
      {/* Thumbnail */}
      <div className={cn("relative overflow-hidden rounded-t-xl", cardHeight)}>
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, 288px"
            className="object-cover"
            placeholder={item.blurDataUrl ? "blur" : undefined}
            blurDataURL={item.blurDataUrl || undefined}
            unoptimized
          />
        ) : (
          <div className={cn(
            "w-full h-full bg-gradient-to-br flex items-center justify-center",
            gradientColor
          )}>
            {icon}
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-2 left-2">
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-md bg-black/60 text-white capitalize"
          )}>
            {category}
          </span>
        </div>

        {/* Pinned Badge */}
        {item.isPinned && (
          <div className="absolute top-2 right-2">
            <PinnedBadge />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3
          className="font-medium text-gray-900 line-clamp-1 group-hover/card:text-primary transition-colors tooltip"
          data-tooltip={item.title}
        >
          {item.title}
        </h3>
        {item.description && (
          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
        )}
        {/* Language indicator — only show when multiple languages are available */}
        {item.availableLanguages && item.availableLanguages.length > 1 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {item.availableLanguages.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
              >
                {lang}
              </span>
            ))}
          </div>
        )}
        {/* Campaign Date Pill */}
        {category === "campaign" && item.sentAt && (() => {
          const dateStatus = getDateStatus(item.sentAt)
          const formattedDate = new Date(item.sentAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
          return dateStatus ? (
            <div className="mt-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white",
                  dateStatus === "past" ? "bg-gray-700" : "bg-primary"
                )}
              >
                <Calendar className="w-3 h-3" />
                {dateStatus === "past" ? "Sent" : "Scheduled"}: {formattedDate}
              </span>
            </div>
          ) : null
        })()}
        {(item.meta || item.status) && (
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
            {item.meta && (
              <p className="text-xs text-gray-400">{item.meta}</p>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {(showFileDownload || showExternalLink) && (
          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
            {showFileDownload && item.fileUrl && (
              <QuickActionPill
                href={item.fileUrl}
                icon={<Download className="w-3 h-3" />}
                label={getFileLabel(item.fileUrl)}
                onClick={handleQuickDownload}
              />
            )}
            {showExternalLink && (
              <QuickActionPill
                href={externalLinkHref}
                icon={<ExternalLink className="w-3 h-3" />}
                label={getExternalLabel(category)}
                onClick={handleQuickExternalClick}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
