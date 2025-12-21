import { Card } from "@/components/ui/Card"
import { Spinner, DeckCardSkeleton, CardSkeleton } from "@/components/ui/Spinner"

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-72" />
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* This Month for Partners */}
          <Card padding="lg">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse" />
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          </Card>

          {/* Latest Sales Decks */}
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
              <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <DeckCardSkeleton key={i} />
              ))}
            </div>
          </Card>

          {/* Product & Releases */}
          <Card padding="lg">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 flex-shrink-0 space-y-6">
          <Card padding="lg">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
