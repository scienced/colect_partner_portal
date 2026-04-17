import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { BookOpen, ExternalLink, Sparkles } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { PinnedBadge } from "@/components/portal/PinnedBadge"
import { getRecentlyUpdatedGitBookPages, normalizeDocUrl } from "@/lib/gitbook"

/**
 * Unified shape for rendering. Manual entries carry summary + category;
 * auto entries carry a spaceLabel instead (e.g. "User docs" / "Admin docs").
 */
type DocsUpdateItem =
  | {
      source: "manual"
      id: string
      title: string
      summary: string
      deepLink: string
      category: string | null
      publishedAt: Date | null
      isPinned: boolean
      pinOrder: number
    }
  | {
      source: "gitbook"
      id: string
      title: string
      summary: string | null // GitBook description when non-empty
      deepLink: string
      category: null
      publishedAt: Date | null
      spaceLabel: string // high-level group: "User docs" / "Admin docs"
      spaceName: string // specific space name
      isNew: boolean
      isPinned: false
      pinOrder: 0
    }

export default async function DocsUpdatesPage() {
  const now = new Date()

  // Fetch manual entries from Prisma and auto entries from GitBook in parallel.
  // getRecentlyUpdatedGitBookPages never throws; returns [] on any failure.
  const [manualDocs, gitbookDocs] = await Promise.all([
    prisma.docsUpdate.findMany({
      where: { publishedAt: { not: null } },
      orderBy: [
        { isPinned: "desc" },
        { pinOrder: "desc" },
        { publishedAt: "desc" },
      ],
    }),
    getRecentlyUpdatedGitBookPages(30),
  ])

  // Dedup: if a manual entry covers the same URL as an auto entry, keep the
  // manual one (it has a curated summary).
  const manualUrls = new Set(manualDocs.map((d) => normalizeDocUrl(d.deepLink)))

  const manualItems: DocsUpdateItem[] = manualDocs.map((d) => {
    const isPinActive =
      d.isPinned && (!d.pinExpiresAt || new Date(d.pinExpiresAt) > now)
    return {
      source: "manual",
      id: d.id,
      title: d.title,
      summary: d.summary,
      deepLink: d.deepLink,
      category: d.category,
      publishedAt: d.publishedAt,
      isPinned: isPinActive,
      pinOrder: d.pinOrder,
    }
  })

  const autoItems: DocsUpdateItem[] = gitbookDocs
    .filter((g) => !manualUrls.has(normalizeDocUrl(g.url)))
    .map((g) => ({
      source: "gitbook" as const,
      id: g.id,
      title: g.title,
      summary: g.description,
      deepLink: g.url,
      category: null,
      publishedAt: new Date(g.publishedAt),
      spaceLabel: g.space.label,
      spaceName: g.space.name,
      isNew: g.isNew,
      isPinned: false,
      pinOrder: 0,
    }))

  const processedDocs = [...manualItems, ...autoItems].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    if (a.isPinned && b.isPinned && a.pinOrder !== b.pinOrder) {
      return b.pinOrder - a.pinOrder
    }
    const aDate = a.publishedAt ? a.publishedAt.getTime() : 0
    const bDate = b.publishedAt ? b.publishedAt.getTime() : 0
    return bDate - aDate
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentation Updates"
        description="Latest documentation changes and additions"
      />

      {processedDocs.length > 0 ? (
        <div className="space-y-4">
          {processedDocs.map((doc) => (
            <Card
              key={`${doc.source}:${doc.id}`}
              hover
              padding="lg"
              className="relative"
            >
              {/* Pinned Badge (manual entries only) */}
              {doc.source === "manual" && doc.isPinned && (
                <div className="absolute top-4 right-4">
                  <PinnedBadge />
                </div>
              )}
              <div className="flex items-start gap-4">
                {/* Icon tile — different color + icon for auto vs manual */}
                {doc.source === "manual" ? (
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-slate-500" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                      {/* Description (both sources, when available) */}
                      {doc.summary && (
                        <p className="text-gray-600 mt-1">{doc.summary}</p>
                      )}
                      {/* Origin line for GitBook entries */}
                      {doc.source === "gitbook" && (
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                          From {doc.spaceLabel}
                          {doc.spaceName && doc.spaceName !== doc.spaceLabel
                            ? ` · ${doc.spaceName}`
                            : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {doc.source === "gitbook" && doc.isNew && (
                        <StatusBadge status="success">New</StatusBadge>
                      )}
                      {doc.source === "manual" && doc.category && (
                        <StatusBadge status="info">{doc.category}</StatusBadge>
                      )}
                      <span className="text-sm text-gray-400">
                        {doc.publishedAt &&
                          formatDistanceToNow(doc.publishedAt, {
                            addSuffix: true,
                          })}
                      </span>
                    </div>
                  </div>
                  <a
                    href={doc.deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {doc.source === "manual" ? "Read Documentation" : "Open Page"}
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No documentation updates yet</p>
        </Card>
      )}
    </div>
  )
}
