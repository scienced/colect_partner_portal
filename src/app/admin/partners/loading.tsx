import { Card } from "@/components/ui/Card"
import { CardSkeleton } from "@/components/ui/Spinner"

export default function AdminPartnersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-40 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-72" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-32" />
      </div>

      {/* List */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
