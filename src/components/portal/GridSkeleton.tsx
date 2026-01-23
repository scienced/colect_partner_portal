import { Card } from "@/components/ui/Card"

interface GridSkeletonProps {
  count?: number
  /** Card padding style */
  cardPadding?: "none" | "md"
  /** Whether to show rounded thumbnail placeholder */
  roundedThumbnail?: boolean
  /** Aspect ratio class for the thumbnail area */
  aspectRatio?: string
}

export function GridSkeleton({
  count = 6,
  cardPadding = "md",
  roundedThumbnail = true,
  aspectRatio = "aspect-video",
}: GridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <Card key={i} padding={cardPadding} className={cardPadding === "none" ? "overflow-hidden" : ""}>
          <div className="animate-pulse">
            <div
              className={`${aspectRatio} bg-gray-200 ${roundedThumbnail ? "rounded-md" : ""} ${cardPadding === "md" ? "mb-4" : ""}`}
            />
            <div className={cardPadding === "none" ? "p-4" : ""}>
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
