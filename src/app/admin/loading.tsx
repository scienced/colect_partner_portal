import { Card } from "@/components/ui/Card"
import { Spinner } from "@/components/ui/Spinner"

function StatCardSkeleton() {
  return (
    <Card padding="lg">
      <div className="flex items-center gap-4 animate-pulse">
        <div className="w-12 h-12 bg-gray-200 rounded-lg" />
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-12" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
      </div>
    </Card>
  )
}

export default function AdminLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Quick Actions */}
      <Card padding="lg">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
        <div className="flex gap-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded w-32" />
          ))}
        </div>
      </Card>

      {/* Recent Assets */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-8 bg-gray-200 rounded w-20" />
        </div>
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      </Card>
    </div>
  )
}
