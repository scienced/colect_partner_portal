import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes without conflicts.
 *
 * Combines clsx (for conditional classes) with tailwind-merge (for deduplication).
 *
 * @example
 * // Basic usage
 * cn("px-4 py-2", "bg-primary")
 * // => "px-4 py-2 bg-primary"
 *
 * @example
 * // Conditional classes
 * cn("base-class", isActive && "active-class", isDisabled && "opacity-50")
 *
 * @example
 * // Override classes (tailwind-merge handles this)
 * cn("px-4", "px-6")
 * // => "px-6" (last one wins)
 *
 * @example
 * // Object syntax
 * cn("base", { "active": isActive, "disabled": isDisabled })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
