import { Card } from "@/components/ui/Card"

function TeamMemberSkeleton() {
  return (
    <Card padding="md">
      <div className="flex items-start gap-4 animate-pulse">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
        <div className="flex gap-1">
          <div className="w-8 h-8 bg-gray-200 rounded" />
          <div className="w-8 h-8 bg-gray-200 rounded" />
        </div>
      </div>
    </Card>
  )
}

export default function AdminWhoIsWhoLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-48" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-40" />
      </div>

      {/* Department sections */}
      {[...Array(2)].map((_, i) => (
        <div key={i}>
          <div className="h-6 bg-gray-200 rounded w-24 mb-4 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, j) => (
              <TeamMemberSkeleton key={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
