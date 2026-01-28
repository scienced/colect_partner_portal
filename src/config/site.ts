/**
 * Site Configuration
 *
 * All branding can be customized via environment variables.
 * This allows you to use a single codebase for multiple deployments.
 *
 * Environment variables (all optional, with sensible defaults):
 * - NEXT_PUBLIC_SITE_NAME: Company name (default: "Your Company")
 * - NEXT_PUBLIC_SITE_TITLE: Portal title (default: "Partner Portal")
 * - NEXT_PUBLIC_SITE_TAGLINE: Tagline shown on login
 * - NEXT_PUBLIC_SUPPORT_EMAIL: Support email address
 * - NEXT_PUBLIC_PRIMARY_COLOR: Brand color as hex (default: "#ef556d")
 * - NEXT_PUBLIC_LOGO_URL: Logo URL (can be external URL or /path in public folder)
 * - NEXT_PUBLIC_LOGO_WIDTH: Logo width in pixels (default: 120)
 * - NEXT_PUBLIC_LOGO_HEIGHT: Logo height in pixels (default: 40)
 */

export const siteConfig = {
  /** Company/Product name displayed throughout the portal */
  name: process.env.NEXT_PUBLIC_SITE_NAME || "Your Company",

  /** Portal title (shown in browser tab and headers) */
  title: process.env.NEXT_PUBLIC_SITE_TITLE || "Partner Portal",

  /** Company tagline or description */
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || "Partner-only workspace for resellers and system integrators",

  /** Support email address (shown on login page and error screens) */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@yourcompany.com",

  /** Default sender email for system emails (can be overridden by EMAIL_FROM env var) */
  defaultFromEmail: process.env.EMAIL_FROM || "portal@yourcompany.com",

  /** URL to your documentation site (used in admin placeholders) */
  docsUrl: process.env.NEXT_PUBLIC_DOCS_URL || null,

  /**
   * Primary brand color (hex format)
   * Only need to set this in ONE place - the env var
   * Tailwind uses CSS variables that are injected from this value
   */
  primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#ef556d",

  /**
   * Logo URL - can be:
   * - External URL (e.g., "https://your-bucket.s3.amazonaws.com/logo.png")
   * - Path in public folder (e.g., "/logo.png")
   * - null for text-only logo (shows company name)
   */
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || null,

  /** Logo dimensions (only used if logoUrl is set) */
  logoWidth: parseInt(process.env.NEXT_PUBLIC_LOGO_WIDTH || "120", 10),
  logoHeight: parseInt(process.env.NEXT_PUBLIC_LOGO_HEIGHT || "40", 10),
}

/**
 * Get the full site title (e.g., "Your Company Partner Portal")
 */
export function getFullTitle(): string {
  return `${siteConfig.name} ${siteConfig.title}`
}

/**
 * Get the sender email (prefers env var, falls back to config)
 */
export function getSenderEmail(): string {
  return process.env.EMAIL_FROM || siteConfig.defaultFromEmail
}

/**
 * Convert hex color to RGB values (space-separated for CSS variables)
 * e.g., "#ef556d" -> "239 85 109"
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return "239 85 109" // fallback to default coral
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
}

/**
 * Get the primary color as RGB values for CSS variable injection
 */
export function getPrimaryColorRgb(): string {
  return hexToRgb(siteConfig.primaryColor)
}
