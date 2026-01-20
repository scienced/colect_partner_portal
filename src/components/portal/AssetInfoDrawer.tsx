"use client"

import { useState } from "react"
import Image from "next/image"
import { format } from "date-fns"
import { Drawer } from "@/components/ui/Drawer"
import { Button } from "@/components/ui/Button"
import {
  FileText,
  Play,
  Mail,
  ExternalLink,
  BookOpen,
  Calendar,
  Clock,
  Globe,
  Users,
  Link2,
  Check,
  Copy,
  Download,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAnalytics } from "@/hooks/useAnalytics"

// Helper to extract file extension from URL
function getFileExtension(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const pathname = new URL(url, "https://example.com").pathname
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/)
    if (match) {
      return match[1].toUpperCase()
    }
  } catch {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
    if (match) {
      return match[1].toUpperCase()
    }
  }
  return null
}

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

interface AssetInfoDrawerProps {
  asset: AssetInfo | null
  open: boolean
  onClose: () => void
}

const categoryConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  deck: {
    icon: <FileText className="w-5 h-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  video: {
    icon: <Play className="w-5 h-5" />,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  campaign: {
    icon: <Mail className="w-5 h-5" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  asset: {
    icon: <ExternalLink className="w-5 h-5" />,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
  },
  docs: {
    icon: <BookOpen className="w-5 h-5" />,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
}

export function AssetInfoDrawer({ asset, open, onClose }: AssetInfoDrawerProps) {
  const [copied, setCopied] = useState(false)
  const { trackAssetDownload, trackAssetClick } = useAnalytics()

  const category = asset?.category || asset?.type?.toLowerCase() || "asset"
  const config = categoryConfig[category] || categoryConfig.asset

  const shareUrl = typeof window !== "undefined" && asset
    ? `${window.location.origin}${window.location.pathname}?asset=${asset.id}`
    : ""

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a")
    } catch {
      return dateString
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
    >
      {asset && (
      <div className="flex flex-col h-full">
        {/* Hero Section with Thumbnail */}
        <div className="relative">
          {asset.thumbnailUrl ? (
            <div className="aspect-video w-full bg-gray-100 relative">
              <Image
                src={asset.thumbnailUrl}
                alt={asset.title}
                fill
                sizes="(max-width: 768px) 100vw, 500px"
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <div className={cn(
              "aspect-video w-full flex items-center justify-center",
              config.bgColor
            )}>
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center bg-white/80", config.color)}>
                {config.icon}
              </div>
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute top-4 left-4">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/90 backdrop-blur-sm shadow-sm",
              config.color
            )}>
              {config.icon}
              <span className="capitalize">{category}</span>
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Title & Description */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 leading-tight">
                {asset.title}
              </h2>
              {asset.description && (
                <p className="text-gray-600 mt-2 leading-relaxed">
                  {asset.description}
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              {asset.fileUrl && (
                <a
                  href={asset.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                  onMouseDown={() => trackAssetDownload(asset.id, asset.title, asset.type)}
                >
                  <Download className="w-4 h-4" />
                  Download{getFileExtension(asset.fileUrl) ? ` ${getFileExtension(asset.fileUrl)}` : ""}
                </a>
              )}
              {asset.externalLink && (
                <a
                  href={asset.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  onMouseDown={() => trackAssetClick(asset.id, asset.title, asset.type)}
                >
                  <ExternalLink className="w-4 h-4" />
                  {category === "deck" ? "View Live Document" : "Open Link"}
                </a>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Languages */}
              {asset.language && asset.language.length > 0 && (
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Globe className="w-4 h-4" />
                    <span>Languages</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {asset.language.map((lang) => (
                      <span
                        key={lang}
                        className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Personas */}
              {asset.persona && asset.persona.length > 0 && (
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Users className="w-4 h-4" />
                    <span>Target Personas</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {asset.persona.map((p) => (
                      <span
                        key={p}
                        className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-sm font-medium"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Campaign Goal */}
              {asset.campaignGoal && (
                <div className="col-span-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Target className="w-4 h-4" />
                    <span>Campaign Goal</span>
                  </div>
                  <p className="text-gray-900">{asset.campaignGoal}</p>
                </div>
              )}

              {/* Sent Date (for campaigns) */}
              {asset.sentAt && (
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Mail className="w-4 h-4" />
                    <span>Sent</span>
                  </div>
                  <p className="text-gray-900 text-sm">{formatDateTime(asset.sentAt)}</p>
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Created</span>
                  </div>
                  <p className="text-gray-700 text-sm">{formatDateTime(asset.createdAt)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Updated</span>
                  </div>
                  <p className="text-gray-700 text-sm">{formatDateTime(asset.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Share Link */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Link2 className="w-4 h-4" />
                <span>Share Link</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 truncate font-mono">
                  {shareUrl}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </Drawer>
  )
}

export default AssetInfoDrawer
