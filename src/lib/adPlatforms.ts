/**
 * Ad platforms (client-safe; src/lib/adSets.ts re-validates on the server).
 * Keep in sync with AD_PLATFORMS there.
 */
export const AD_PLATFORM_OPTIONS = [
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "META", label: "Meta (Facebook / Instagram)" },
  { value: "GOOGLE", label: "Google" },
  { value: "OTHER", label: "Other" },
] as const

export function adPlatformLabel(platform: string | null | undefined): string {
  switch (platform) {
    case "LINKEDIN": return "LinkedIn"
    case "META": return "Meta"
    case "GOOGLE": return "Google"
    case "OTHER": return "Other"
    default: return "Ad"
  }
}
