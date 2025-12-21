import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { FileText, Download, ExternalLink } from "lucide-react"

export default async function DecksPage() {
  const decks = await prisma.asset.findMany({
    where: {
      type: "DECK",
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Decks"
        description="Browse and download sales presentations"
      />

      {decks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <Card key={deck.id} hover padding="md">
              <div className="flex flex-col h-full">
                {deck.thumbnailUrl ? (
                  <div className="aspect-video bg-gray-100 rounded-md mb-4 overflow-hidden">
                    <img
                      src={deck.thumbnailUrl}
                      alt={deck.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-md mb-4 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <h3 className="font-medium text-gray-900">{deck.title}</h3>
                {deck.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {deck.description}
                  </p>
                )}
                {deck.language.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {deck.language.map((l) => (
                      <StatusBadge key={l} status="info">
                        {l}
                      </StatusBadge>
                    ))}
                  </div>
                )}
                {deck.fileUrl && (
                  <a
                    href={deck.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No sales decks available yet</p>
        </Card>
      )}
    </div>
  )
}
