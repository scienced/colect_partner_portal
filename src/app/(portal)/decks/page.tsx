"use client"

import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { FileText, Download } from "lucide-react"
import { useDecks } from "@/lib/swr"

export default function DecksPage() {
  const { data, isLoading, error } = useDecks()
  const decks = data?.assets || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Decks"
        description="Browse and download sales presentations"
      />

      {isLoading ? (
        <DecksLoading />
      ) : error ? (
        <Card padding="lg" className="text-center">
          <p className="text-red-500">Failed to load decks</p>
        </Card>
      ) : decks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck: any) => (
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
                {deck.language?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {deck.language.map((l: string) => (
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

function DecksLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} padding="md">
          <div className="animate-pulse">
            <div className="aspect-video bg-gray-200 rounded-md mb-4" />
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </Card>
      ))}
    </div>
  )
}
