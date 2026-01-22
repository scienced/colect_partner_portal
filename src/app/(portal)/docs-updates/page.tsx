import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { BookOpen, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { PinnedBadge } from "@/components/portal/PinnedBadge"

export default async function DocsUpdatesPage() {
  const now = new Date()

  const docsUpdates = await prisma.docsUpdate.findMany({
    where: { publishedAt: { not: null } },
    orderBy: [
      { isPinned: "desc" },
      { pinOrder: "desc" },
      { publishedAt: "desc" },
    ],
  })

  // Filter out expired pins
  const processedDocs = docsUpdates.map((doc) => {
    const isPinActive = doc.isPinned &&
      (!doc.pinExpiresAt || new Date(doc.pinExpiresAt) > now)
    return { ...doc, isPinned: isPinActive }
  }).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    if (a.isPinned && b.isPinned) {
      if (a.pinOrder !== b.pinOrder) return b.pinOrder - a.pinOrder
    }
    const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
    const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
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
            <Card key={doc.id} hover padding="lg" className="relative">
              {/* Pinned Badge */}
              {doc.isPinned && (
                <div className="absolute top-4 right-4">
                  <PinnedBadge />
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                      <p className="text-gray-600 mt-1">{doc.summary}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {doc.category && (
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
                    Read Documentation
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
