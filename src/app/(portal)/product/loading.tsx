import { Card } from "@/components/ui/Card"
import { Spinner, CardSkeleton } from "@/components/ui/Spinner"

export default function ProductLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-full w-32" />
        <div className="h-8 bg-gray-200 rounded-full w-28" />
      </div>

      {/* Content */}
      <Card padding="lg">
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      </Card>

      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
