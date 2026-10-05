import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"

const BRAND_LABELS: Record<string, string> = {
  COLECT: "Colect",
  LE_NEW_BLACK: "Le New Black",
  BOTH: "Colect + LNB",
}

interface AudienceBadgesProps {
  visibility?: string | null
  brand?: string | null
  className?: string
}

/**
 * "Employees only" + Colect/Le New Black chips. The API only sends these
 * fields to employees, so for partners this renders nothing.
 */
export function AudienceBadges({ visibility, brand, className }: AudienceBadgesProps) {
  const employeesOnly = visibility === "EMPLOYEES"
  if (!employeesOnly && !brand) return null

  return (
    <span className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      {employeesOnly && (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800"
          title="Only Colect and Le New Black staff can see this"
        >
          <Lock className="w-3 h-3" />
          Employees only
        </span>
      )}
      {brand && (
        <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
          {BRAND_LABELS[brand] ?? brand}
        </span>
      )}
    </span>
  )
}
