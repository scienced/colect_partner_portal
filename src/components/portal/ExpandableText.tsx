"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Paragraph that keeps line breaks and folds long text to four lines with a
 * "Show more" toggle, so a long description doesn't push the drawer's
 * actions and content out of view. Key it by the item id so it resets.
 */
export function ExpandableText({
  text,
  className,
  threshold = 280,
}: {
  text: string
  className?: string
  /** Characters above which the text starts folded. */
  threshold?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > threshold

  return (
    <div>
      <p className={cn("whitespace-pre-line", long && !expanded && "line-clamp-4", className)}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  )
}
