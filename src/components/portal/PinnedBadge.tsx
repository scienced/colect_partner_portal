import { Pin } from "lucide-react"

interface PinnedBadgeProps {
  className?: string
}

export function PinnedBadge({ className = "" }: PinnedBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-medium ${className}`}
    >
      <Pin className="w-3 h-3" />
      Pinned
    </span>
  )
}
