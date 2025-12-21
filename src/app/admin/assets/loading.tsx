import { Card } from "@/components/ui/Card"
import { CardSkeleton } from "@/components/ui/Spinner"

export default function AdminAssetsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-72" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 animate-pulse">
        <div className="flex items-center gap-4 flex-1">
          <div className="h-10 bg-gray-200 rounded w-64" />
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>
        <div className="h-10 bg-gray-200 rounded w-28" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
