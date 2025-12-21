import { Card } from "@/components/ui/Card"
import { DeckCardSkeleton } from "@/components/ui/Spinner"

export default function DecksLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-40 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-64" />
        <div className="h-10 bg-gray-200 rounded w-32" />
        <div className="h-10 bg-gray-200 rounded w-32" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <DeckCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
